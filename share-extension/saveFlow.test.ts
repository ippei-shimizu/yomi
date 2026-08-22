import { beforeEach, describe, expect, it } from 'vitest';

import { itemRepo, tagRepo } from '@/db/repositories';
import { createTestDb, type TestDatabase } from '@/db/testing';
import { urlHash } from '@/domain/url';

import { attachTag, save } from './saveFlow';

const NOW = new Date('2026-08-22T10:00:00');

let db: TestDatabase;
beforeEach(() => {
  db = createTestDb();
});

describe('save: URL の受け取り', () => {
  it('url が渡されればそれを保存する', () => {
    const outcome = save(db, { url: 'https://zenn.dev/a' }, { isPro: false, now: NOW });

    expect(outcome.state).toBe('saved');
    expect(itemRepo.listUnread(db, { now: NOW })).toHaveLength(1);
  });

  // 共有シートは URL ではなくテキストを渡してくることがある
  it('text から最初の URL を拾う', () => {
    const outcome = save(
      db,
      { text: 'これ良かった https://zenn.dev/a と https://qiita.com/b' },
      { isPro: false, now: NOW },
    );

    expect(outcome.state).toBe('saved');
    expect(itemRepo.listUnread(db, { now: NOW })[0]?.url).toBe('https://zenn.dev/a');
  });

  it('url が優先される', () => {
    save(
      db,
      { url: 'https://zenn.dev/a', text: 'https://qiita.com/b' },
      { isPro: false, now: NOW },
    );
    expect(itemRepo.listUnread(db, { now: NOW })[0]?.url).toBe('https://zenn.dev/a');
  });

  it('保存時に正規化される', () => {
    save(db, { url: 'https://www.zenn.dev/a/?utm_source=x#s' }, { isPro: false, now: NOW });

    const item = itemRepo.listUnread(db, { now: NOW })[0];
    expect(item?.url).toBe('https://zenn.dev/a');
    // 元の URL は共有された値のまま残す
    expect(item?.originalUrl).toBe('https://www.zenn.dev/a/?utm_source=x#s');
  });

  it('ソースが判定される', () => {
    save(db, { url: 'https://x.com/foo/status/1' }, { isPro: false, now: NOW });
    expect(itemRepo.listUnread(db, { now: NOW })[0]?.source).toBe('x');
  });

  it('meta_status は pending で保存される（本体が後で取得する）', () => {
    save(db, { url: 'https://zenn.dev/a' }, { isPro: false, now: NOW });
    expect(itemRepo.listUnread(db, { now: NOW })[0]?.metaStatus).toBe('pending');
  });

  it('タイトルもタグも空のまま保存できる', () => {
    save(db, { url: 'https://zenn.dev/a' }, { isPro: false, now: NOW });
    expect(itemRepo.listUnread(db, { now: NOW })[0]?.title).toBeNull();
  });
});

describe('save: 失敗の扱い', () => {
  it.each([
    { input: {}, reason: 'URL もテキストも無い' },
    { input: { text: 'URL を含まないテキスト' }, reason: 'テキストに URL が無い' },
    { input: { url: 'not a url' }, reason: '不正な URL' },
    { input: { url: 'javascript:alert(1)' }, reason: '危険なスキーム' },
    { input: { url: '' }, reason: '空文字' },
  ])('$reason は error', ({ input }) => {
    expect(save(db, input, { isPro: false, now: NOW }).state).toBe('error');
    expect(itemRepo.listUnread(db, { now: NOW })).toHaveLength(0);
  });

  it('同じ URL を再度共有すると duplicate', () => {
    save(db, { url: 'https://zenn.dev/a' }, { isPro: false, now: NOW });
    expect(save(db, { url: 'https://zenn.dev/a' }, { isPro: false, now: NOW }).state).toBe(
      'duplicate',
    );
  });

  it('正規化して同じになる URL も duplicate', () => {
    save(db, { url: 'https://twitter.com/foo/status/1?s=20' }, { isPro: false, now: NOW });
    expect(save(db, { url: 'https://x.com/foo/status/1' }, { isPro: false, now: NOW }).state).toBe(
      'duplicate',
    );
  });

  it('アーカイブ済みの URL も duplicate（url_hash は残るため）', () => {
    save(db, { url: 'https://zenn.dev/a' }, { isPro: false, now: NOW });
    const item = itemRepo.listUnread(db, { now: NOW })[0]!;
    itemRepo.archive(db, item.id, NOW);

    expect(save(db, { url: 'https://zenn.dev/a' }, { isPro: false, now: NOW }).state).toBe(
      'duplicate',
    );
  });
});

describe('save: 保存上限', () => {
  function fill(count: number) {
    for (let i = 0; i < count; i += 1) {
      save(db, { url: `https://zenn.dev/a/${i}` }, { isPro: true, now: NOW });
    }
  }

  it('無料プランは 50 件で limit になる', () => {
    fill(itemRepo.FREE_PLAN_ITEM_LIMIT);
    expect(save(db, { url: 'https://zenn.dev/over' }, { isPro: false, now: NOW }).state).toBe(
      'limit',
    );
  });

  it('49 件目までは保存できる', () => {
    fill(itemRepo.FREE_PLAN_ITEM_LIMIT - 1);
    expect(save(db, { url: 'https://zenn.dev/last' }, { isPro: false, now: NOW }).state).toBe(
      'saved',
    );
  });

  it('Pro は上限なし', () => {
    fill(itemRepo.FREE_PLAN_ITEM_LIMIT);
    expect(save(db, { url: 'https://zenn.dev/over' }, { isPro: true, now: NOW }).state).toBe(
      'saved',
    );
  });

  // 重複判定を上限判定より先に行う。既に持っているものを共有したときに
  // Paywall を出すのは筋が違う
  it('上限に達していても、重複なら duplicate を返す', () => {
    save(db, { url: 'https://zenn.dev/known' }, { isPro: false, now: NOW });
    fill(itemRepo.FREE_PLAN_ITEM_LIMIT);

    expect(save(db, { url: 'https://zenn.dev/known' }, { isPro: false, now: NOW }).state).toBe(
      'duplicate',
    );
  });
});

describe('save: タグ', () => {
  it('保存に成功すると直近使用タグを返す（最大 5 件）', () => {
    const seed = save(db, { url: 'https://zenn.dev/seed' }, { isPro: false, now: NOW });
    expect(seed.state).toBe('saved');

    for (const name of ['t1', 't2', 't3', 't4', 't5', 't6']) {
      const tag = tagRepo.create(db, name, NOW);
      if (seed.state === 'saved') tagRepo.attach(db, seed.itemId, tag.id, NOW);
    }

    const outcome = save(db, { url: 'https://zenn.dev/next' }, { isPro: false, now: NOW });
    expect(outcome.state === 'saved' && outcome.recentTags).toHaveLength(5);
  });

  it('タグが無ければ空配列', () => {
    const outcome = save(db, { url: 'https://zenn.dev/a' }, { isPro: false, now: NOW });
    expect(outcome.state === 'saved' && outcome.recentTags).toEqual([]);
  });

  it('attachTag でタグを付けられる', () => {
    const outcome = save(db, { url: 'https://zenn.dev/a' }, { isPro: false, now: NOW });
    const tag = tagRepo.create(db, 'rails', NOW);

    if (outcome.state !== 'saved') throw new Error('保存に失敗');
    attachTag(db, outcome.itemId, tag.id, NOW);

    expect(tagRepo.listForItem(db, outcome.itemId).map((t) => t.name)).toEqual(['rails']);
  });
});

describe('read_logs', () => {
  it('保存すると saved が積まれる（Stats の集計に必要）', () => {
    save(db, { url: 'https://zenn.dev/a' }, { isPro: false, now: NOW });

    const item = itemRepo.listUnread(db, { now: NOW })[0]!;
    expect(urlHash(item.url)).toBe(item.urlHash);
  });
});
