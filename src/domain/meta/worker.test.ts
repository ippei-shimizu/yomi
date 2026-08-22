import { beforeEach, describe, expect, it, vi } from 'vitest';

import { itemRepo } from '@/db/repositories';
import { createTestDb, type TestDatabase } from '@/db/testing';
import { urlHash } from '@/domain/url';

import { DEFAULT_BATCH_SIZE, runMetaFetchWorker } from './worker';

const NOW = new Date('2026-08-22T10:00:00');
const OGP = '<head><meta property="og:title" content="取得したタイトル"></head>';

let db: TestDatabase;
beforeEach(() => {
  db = createTestDb();
});

let seq = 0;
function save(url = `https://zenn.dev/a/${(seq += 1)}`, savedAt = NOW) {
  return itemRepo.insert(
    db,
    { url, originalUrl: url, urlHash: urlHash(url), source: 'zenn' },
    savedAt,
  );
}

function htmlResponse(html = OGP): Response {
  return new Response(html, { status: 200, headers: { 'content-type': 'text/html' } });
}

describe('対象の選び方', () => {
  it('pending のものだけを処理する', async () => {
    const pending = save();
    const done = save();
    itemRepo.applyMetadata(db, done.id, { title: '既に取得済み' }, NOW);

    const fetchImpl = vi.fn().mockResolvedValue(htmlResponse());
    const result = await runMetaFetchWorker(db, { fetchImpl, now: NOW });

    expect(result).toMatchObject({ processed: 1, succeeded: 1 });
    expect(itemRepo.findById(db, pending.id)?.title).toBe('取得したタイトル');
    expect(itemRepo.findById(db, done.id)?.title).toBe('既に取得済み');
  });

  it('1 回あたり最大 10 件（既定）', async () => {
    for (let i = 0; i < 15; i += 1) save();

    const fetchImpl = vi.fn().mockResolvedValue(htmlResponse());
    const result = await runMetaFetchWorker(db, { fetchImpl, now: NOW });

    expect(result.processed).toBe(DEFAULT_BATCH_SIZE);
    expect(fetchImpl).toHaveBeenCalledTimes(DEFAULT_BATCH_SIZE);
  });

  it('インポート直後は件数を引き上げられる', async () => {
    for (let i = 0; i < 15; i += 1) save();

    const fetchImpl = vi.fn().mockResolvedValue(htmlResponse());
    const result = await runMetaFetchWorker(db, { fetchImpl, batchSize: 50, now: NOW });

    expect(result.processed).toBe(15);
  });

  it('saved_at の古い順に処理する', async () => {
    const older = save('https://zenn.dev/older', new Date('2026-08-01T00:00:00'));
    save('https://zenn.dev/newer', new Date('2026-08-20T00:00:00'));

    const fetchImpl = vi.fn().mockResolvedValue(htmlResponse());
    await runMetaFetchWorker(db, { fetchImpl, batchSize: 1, now: NOW });

    expect(itemRepo.findById(db, older.id)?.metaStatus).toBe('done');
  });

  it('対象が無ければ fetch しない', async () => {
    const fetchImpl = vi.fn();
    expect(await runMetaFetchWorker(db, { fetchImpl, now: NOW })).toEqual({
      processed: 0,
      succeeded: 0,
      failed: 0,
      merged: 0,
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe('リトライ（3 回で failed）', () => {
  it('失敗するとリトライ回数が増え pending のまま', async () => {
    const item = save();
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('offline'));

    await runMetaFetchWorker(db, { fetchImpl, now: NOW });

    const row = itemRepo.findById(db, item.id);
    expect(row?.metaRetryCount).toBe(1);
    expect(row?.metaStatus).toBe('pending');
  });

  it('3 回失敗すると failed になり、以後は対象から外れる', async () => {
    const item = save();
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('offline'));

    for (let i = 0; i < 3; i += 1) await runMetaFetchWorker(db, { fetchImpl, now: NOW });

    expect(itemRepo.findById(db, item.id)).toMatchObject({
      metaStatus: 'failed',
      metaRetryCount: 3,
    });

    fetchImpl.mockClear();
    const result = await runMetaFetchWorker(db, { fetchImpl, now: NOW });
    expect(result.processed).toBe(0);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('HTTP エラーもリトライ対象', async () => {
    const item = save();
    const fetchImpl = vi.fn().mockResolvedValue(new Response('', { status: 500 }));

    await runMetaFetchWorker(db, { fetchImpl, now: NOW });
    expect(itemRepo.findById(db, item.id)?.metaRetryCount).toBe(1);
  });

  it('詳細画面からの再取得でリトライ回数がリセットされる', async () => {
    const item = save();
    const failing = vi.fn().mockRejectedValue(new TypeError('offline'));
    for (let i = 0; i < 3; i += 1) await runMetaFetchWorker(db, { fetchImpl: failing, now: NOW });

    itemRepo.resetMetaStatus(db, item.id, NOW);
    const ok = vi.fn().mockResolvedValue(htmlResponse());
    await runMetaFetchWorker(db, { fetchImpl: ok, now: NOW });

    expect(itemRepo.findById(db, item.id)).toMatchObject({
      metaStatus: 'done',
      title: '取得したタイトル',
    });
  });
});

describe('並列実行', () => {
  // 1 件のタイムアウトが他の件をブロックしてはいけない
  it('遅い 1 件があっても他が完了する', async () => {
    const slow = save('https://zenn.dev/slow');
    for (let i = 0; i < 5; i += 1) save();

    const fetchImpl = vi.fn().mockImplementation(async (url: string) => {
      if (url === 'https://zenn.dev/slow') {
        await new Promise((resolve) => setTimeout(resolve, 50));
        throw new TypeError('timeout');
      }
      return htmlResponse();
    });

    const result = await runMetaFetchWorker(db, { fetchImpl, now: NOW });

    expect(result).toMatchObject({ processed: 6, succeeded: 5, failed: 1 });
    expect(itemRepo.findById(db, slow.id)?.metaRetryCount).toBe(1);
  });

  it('同時実行数を超えて走らせない', async () => {
    for (let i = 0; i < 9; i += 1) save();

    let inFlight = 0;
    let peak = 0;
    const fetchImpl = vi.fn().mockImplementation(async () => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight -= 1;
      return htmlResponse();
    });

    await runMetaFetchWorker(db, { fetchImpl, concurrency: 3, now: NOW });
    expect(peak).toBeLessThanOrEqual(3);
  });
});

describe('短縮 URL の展開', () => {
  function shortItem(finalUrl: string) {
    const item = save('https://t.co/abc123');
    const fetchImpl = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (init?.method === 'HEAD') {
        return Object.defineProperty(new Response(null, { status: 200 }), 'url', {
          value: finalUrl,
        });
      }
      return htmlResponse();
    });
    return { item, fetchImpl };
  }

  it('HEAD で展開して url と url_hash を更新する', async () => {
    const { item, fetchImpl } = shortItem('https://zenn.dev/foo/articles/bar?utm_source=x');
    await runMetaFetchWorker(db, { fetchImpl, now: NOW });

    const row = itemRepo.findById(db, item.id);
    expect(row?.url).toBe('https://zenn.dev/foo/articles/bar');
    expect(row?.urlHash).toBe(urlHash('https://zenn.dev/foo/articles/bar'));
    // originalUrl は共有された元の値を保つ
    expect(row?.originalUrl).toBe('https://t.co/abc123');
  });

  it('展開先が保存済みなら統合し、古い方を残す', async () => {
    const existing = save('https://zenn.dev/foo/articles/bar', new Date('2026-08-01T00:00:00'));
    const { item, fetchImpl } = shortItem('https://zenn.dev/foo/articles/bar');

    const result = await runMetaFetchWorker(db, { fetchImpl, now: NOW });

    expect(result.merged).toBe(1);
    expect(itemRepo.findById(db, item.id)).toBeUndefined();
    expect(itemRepo.findById(db, existing.id)).toBeDefined();
  });

  it('HEAD が失敗しても元の URL のままメタ取得に進む', async () => {
    const item = save('https://t.co/abc123');
    const fetchImpl = vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
      if (init?.method === 'HEAD') throw new TypeError('offline');
      return htmlResponse();
    });

    const result = await runMetaFetchWorker(db, { fetchImpl, now: NOW });

    expect(result.succeeded).toBe(1);
    expect(itemRepo.findById(db, item.id)?.url).toBe('https://t.co/abc123');
  });

  it('短縮 URL でなければ HEAD を投げない', async () => {
    save('https://zenn.dev/a/normal');
    const fetchImpl = vi.fn().mockResolvedValue(htmlResponse());

    await runMetaFetchWorker(db, { fetchImpl, now: NOW });

    expect(fetchImpl.mock.calls.every(([, init]) => init?.method !== 'HEAD')).toBe(true);
  });
});

describe('メタの反映', () => {
  it('取得できたフィールドだけを更新する', async () => {
    const item = save();
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        htmlResponse('<head><meta property="og:site_name" content="Zenn"></head>'),
      );

    await runMetaFetchWorker(db, { fetchImpl, now: NOW });

    const row = itemRepo.findById(db, item.id);
    expect(row?.siteName).toBe('Zenn');
    expect(row?.title).toBeNull();
    expect(row?.metaStatus).toBe('done');
  });

  it('Instagram は fetch せずユーザー名をタイトルにする', async () => {
    const url = 'https://instagram.com/foo/p/abc';
    const item = itemRepo.insert(
      db,
      { url, originalUrl: url, urlHash: urlHash(url), source: 'instagram' },
      NOW,
    );

    const fetchImpl = vi.fn();
    const result = await runMetaFetchWorker(db, { fetchImpl, now: NOW });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result.succeeded).toBe(1);
    expect(itemRepo.findById(db, item.id)).toMatchObject({ title: '@foo', metaStatus: 'done' });
  });
});
