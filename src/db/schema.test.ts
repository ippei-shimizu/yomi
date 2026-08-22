import { describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';

import { items, itemTags, readLogs, tags } from './schema';
import { createTestDb, runMigrations } from './testing';

const now = new Date('2026-08-22T00:00:00.000Z');

/**
 * アプリが定義したテーブルだけを返す。
 * sqlite_* / __drizzle_* / FTS5 の shadow テーブル（items_fts_data 等）は除く。
 */
function baseTableNames(db: ReturnType<typeof createTestDb>): string[] {
  return db
    .all<{ name: string }>(sql`SELECT name FROM sqlite_master WHERE type = 'table'`)
    .map((r) => r.name)
    .filter(
      (name) =>
        !name.startsWith('sqlite_') &&
        !name.startsWith('__drizzle') &&
        !name.startsWith('items_fts'),
    )
    .sort();
}

function newItem(overrides: Partial<typeof items.$inferInsert> = {}) {
  return {
    id: 'item-1',
    url: 'https://zenn.dev/a',
    originalUrl: 'https://zenn.dev/a?utm_source=x',
    urlHash: 'hash-1',
    source: 'zenn' as const,
    savedAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('マイグレーション', () => {
  it('4 テーブルすべてが作られる', () => {
    expect(baseTableNames(createTestDb())).toEqual(['item_tags', 'items', 'read_logs', 'tags']);
  });

  it('全文検索用の items_fts が作られる', () => {
    const db = createTestDb();
    const names = db
      .all<{ name: string }>(sql`SELECT name FROM sqlite_master WHERE type = 'table'`)
      .map((r) => r.name);

    expect(names).toContain('items_fts');
  });

  it('items_fts を同期するトリガーが 3 つある', () => {
    const db = createTestDb();
    const triggers = db
      .all<{ name: string }>(sql`SELECT name FROM sqlite_master WHERE type = 'trigger'`)
      .map((r) => r.name);

    expect(triggers.sort()).toEqual(['items_fts_delete', 'items_fts_insert', 'items_fts_update']);
  });

  // 起動のたびに実行されるため、2 回目以降が失敗すると 2 回目の起動で落ちる
  it('二重に適用しても失敗しない（冪等）', () => {
    const db = createTestDb();
    expect(() => runMigrations(db)).not.toThrow();
    expect(() => runMigrations(db)).not.toThrow();

    expect(baseTableNames(db)).toEqual(['item_tags', 'items', 'read_logs', 'tags']);
  });

  it('設計どおりのインデックスが作られる', () => {
    const db = createTestDb();
    const names = db
      .all<{ name: string }>(sql`SELECT name FROM sqlite_master WHERE type = 'index'`)
      .map((r) => r.name);

    expect(names).toEqual(
      expect.arrayContaining([
        'idx_items_status_saved',
        'idx_items_meta_status',
        'idx_read_logs_at',
        'items_url_hash_unique',
        'tags_name_unique',
      ]),
    );
  });
});

describe('items', () => {
  it('status / meta_status の既定値が入る', () => {
    const db = createTestDb();
    db.insert(items).values(newItem()).run();

    const row = db.select().from(items).get();
    expect(row?.status).toBe('unread');
    expect(row?.metaStatus).toBe('pending');
    expect(row?.metaRetryCount).toBe(0);
  });

  it('url_hash が重複すると弾かれる（重複検知の要）', () => {
    const db = createTestDb();
    db.insert(items).values(newItem()).run();

    expect(() =>
      db
        .insert(items)
        .values(newItem({ id: 'item-2' }))
        .run(),
    ).toThrow(/UNIQUE/i);
  });

  it('url_hash が違えば同じ URL 文字列でも保存できる', () => {
    const db = createTestDb();
    db.insert(items).values(newItem()).run();
    db.insert(items)
      .values(newItem({ id: 'item-2', urlHash: 'hash-2' }))
      .run();

    expect(db.select().from(items).all()).toHaveLength(2);
  });

  it('timestamp が Date として往復する', () => {
    const db = createTestDb();
    db.insert(items)
      .values(newItem({ readAt: now, snoozedUntil: now }))
      .run();

    const row = db.select().from(items).get();
    expect(row?.savedAt).toEqual(now);
    expect(row?.readAt).toEqual(now);
    expect(row?.snoozedUntil).toEqual(now);
  });

  it('未設定の timestamp は null のまま', () => {
    const db = createTestDb();
    db.insert(items).values(newItem()).run();

    const row = db.select().from(items).get();
    expect(row?.readAt).toBeNull();
    expect(row?.archivedAt).toBeNull();
    expect(row?.snoozedUntil).toBeNull();
  });
});

describe('item_tags', () => {
  function seed() {
    const db = createTestDb();
    db.insert(items).values(newItem()).run();
    db.insert(tags).values({ id: 'tag-1', name: 'rails', createdAt: now, updatedAt: now }).run();
    db.insert(itemTags).values({ itemId: 'item-1', tagId: 'tag-1' }).run();
    return db;
  }

  it('同じ組み合わせを二重に付けられない', () => {
    const db = seed();
    expect(() => db.insert(itemTags).values({ itemId: 'item-1', tagId: 'tag-1' }).run()).toThrow(
      /UNIQUE|PRIMARY/i,
    );
  });

  it('存在しない item を参照できない', () => {
    const db = seed();
    expect(() => db.insert(itemTags).values({ itemId: 'missing', tagId: 'tag-1' }).run()).toThrow(
      /FOREIGN KEY/i,
    );
  });

  it('item を消すと item_tags も消える（cascade）', () => {
    const db = seed();
    db.delete(items).where(eq(items.id, 'item-1')).run();

    expect(db.select().from(itemTags).all()).toHaveLength(0);
    expect(db.select().from(tags).all()).toHaveLength(1);
  });

  it('tag を消すと item_tags も消えるが item は残る（cascade）', () => {
    const db = seed();
    db.delete(tags).where(eq(tags.id, 'tag-1')).run();

    expect(db.select().from(itemTags).all()).toHaveLength(0);
    expect(db.select().from(items).all()).toHaveLength(1);
  });
});

describe('read_logs', () => {
  it('item を物理削除しても履歴は残る（週次集計を壊さない）', () => {
    const db = createTestDb();
    db.insert(items).values(newItem()).run();
    db.insert(readLogs).values({ id: 'log-1', itemId: 'item-1', event: 'saved', at: now }).run();

    db.delete(items).where(eq(items.id, 'item-1')).run();

    expect(db.select().from(readLogs).all()).toHaveLength(1);
  });

  it('同じ item に複数のイベントを積める（読了→未読に戻す等）', () => {
    const db = createTestDb();
    db.insert(items).values(newItem()).run();
    db.insert(readLogs)
      .values([
        { id: 'log-1', itemId: 'item-1', event: 'saved', at: now },
        { id: 'log-2', itemId: 'item-1', event: 'read', at: now },
        { id: 'log-3', itemId: 'item-1', event: 'unread', at: now },
      ])
      .run();

    expect(db.select().from(readLogs).all()).toHaveLength(3);
  });
});

describe('tags', () => {
  it('name が重複すると弾かれる', () => {
    const db = createTestDb();
    db.insert(tags).values({ id: 'tag-1', name: 'rails', createdAt: now, updatedAt: now }).run();

    expect(() =>
      db.insert(tags).values({ id: 'tag-2', name: 'rails', createdAt: now, updatedAt: now }).run(),
    ).toThrow(/UNIQUE/i);
  });
});
