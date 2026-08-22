import { beforeAll, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';

import { items } from '../schema';
import { createTestDb, type TestDatabase } from '../testing';
import * as itemRepo from './itemRepo';
import * as statsRepo from './statsRepo';

/**
 * docs/PRD.md §8「ホーム表示 500ms 以内（アイテム 5,000 件時）」の検証。
 *
 * ここで測れるのは DB クエリまで（描画は含まない）。実機より速い環境なので
 * 「余裕を持って通ること」と「インデックスが使われること」を見る。
 */
const ITEM_COUNT = 5_000;
const NOW = new Date('2026-08-22T10:00:00');
const MS_PER_DAY = 24 * 60 * 60 * 1000;

let db: TestDatabase;

beforeAll(() => {
  db = createTestDb();
  const rows = Array.from({ length: ITEM_COUNT }, (_, i) => ({
    id: `item-${String(i).padStart(6, '0')}`,
    url: `https://zenn.dev/a/${i}`,
    originalUrl: `https://zenn.dev/a/${i}`,
    urlHash: `hash-${i}`,
    source: 'zenn' as const,
    status: (i % 10 === 0 ? 'read' : 'unread') as 'read' | 'unread',
    savedAt: new Date(NOW.getTime() - (i % 400) * MS_PER_DAY),
    updatedAt: NOW,
  }));

  db.transaction((tx) => {
    for (let i = 0; i < rows.length; i += 500) {
      tx.insert(items)
        .values(rows.slice(i, i + 500))
        .run();
    }
  });
});

function measure(fn: () => unknown): number {
  const started = performance.now();
  fn();
  return performance.now() - started;
}

describe(`${ITEM_COUNT} 件での性能`, () => {
  it('listUnread が 500ms 以内に返る', () => {
    const elapsed = measure(() => itemRepo.listUnread(db, { now: NOW }));
    expect(elapsed).toBeLessThan(500);
  });

  it('countForLimit が 500ms 以内に返る（Share Extension の上限判定）', () => {
    expect(measure(() => itemRepo.countForLimit(db))).toBeLessThan(500);
  });

  it('listStale が 500ms 以内に返る', () => {
    expect(measure(() => itemRepo.listStale(db, { now: NOW }))).toBeLessThan(500);
  });

  it('recentWeeks（8 週分の集計）が 500ms 以内に返る', () => {
    expect(measure(() => statsRepo.recentWeeks(db, NOW))).toBeLessThan(500);
  });
});

describe('インデックスが使われること', () => {
  function plan(query: string): string {
    return db
      .all<{ detail: string }>(sql.raw(`EXPLAIN QUERY PLAN ${query}`))
      .map((r) => r.detail)
      .join(' | ');
  }

  it('未読の絞り込みが idx_items_status_saved を使う', () => {
    expect(plan("SELECT * FROM items WHERE status = 'unread' ORDER BY saved_at")).toContain(
      'idx_items_status_saved',
    );
  });

  it('url_hash の重複検知が unique インデックスを使う', () => {
    expect(plan("SELECT id FROM items WHERE url_hash = 'x'")).toContain('items_url_hash_unique');
  });

  it('MetaFetchWorker の対象抽出が idx_items_meta_status を使う', () => {
    expect(plan("SELECT * FROM items WHERE meta_status = 'pending'")).toContain(
      'idx_items_meta_status',
    );
  });

  it('read_logs の期間絞り込みが idx_read_logs_at を使う', () => {
    expect(plan('SELECT * FROM read_logs WHERE at >= 0 AND at < 1')).toContain('idx_read_logs_at');
  });

  // インデックスが無いと 5,000 件の全走査になる
  it('未読一覧が全表スキャンにならない', () => {
    expect(plan("SELECT * FROM items WHERE status = 'unread' ORDER BY saved_at")).not.toContain(
      'SCAN items',
    );
  });
});
