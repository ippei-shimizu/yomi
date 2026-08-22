import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';

import { items, readLogs } from '../schema';
import { createTestDb, type TestDatabase } from '../testing';
import * as itemRepo from './itemRepo';

const NOW = new Date('2026-08-22T10:00:00');

function daysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);
}

let db: TestDatabase;
beforeEach(() => {
  db = createTestDb();
});

function save(overrides: Partial<Parameters<typeof itemRepo.insert>[1]> = {}, at = NOW) {
  return itemRepo.insert(
    db,
    {
      url: `https://zenn.dev/${Math.random()}`,
      originalUrl: 'https://zenn.dev/a',
      urlHash: `hash-${Math.random()}`,
      source: 'zenn',
      ...overrides,
    },
    at,
  );
}

function logsFor(itemId: string) {
  return db.select().from(readLogs).where(eq(readLogs.itemId, itemId)).all();
}

describe('insert', () => {
  it('unread で保存され、read_logs に saved が積まれる', () => {
    const item = save();

    expect(item.status).toBe('unread');
    expect(item.savedAt).toEqual(NOW);
    expect(logsFor(item.id).map((l) => l.event)).toEqual(['saved']);
  });

  it('id を指定しなければ採番される', () => {
    expect(save().id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('url_hash が重複すると失敗し、read_logs も残らない（トランザクション）', () => {
    save({ urlHash: 'dup' });
    expect(() => save({ urlHash: 'dup' })).toThrow(/UNIQUE/i);

    expect(db.select().from(readLogs).all()).toHaveLength(1);
  });
});

describe('existsByHash / findExistingHashes', () => {
  it('保存済みの hash を検出する', () => {
    save({ urlHash: 'a' });

    expect(itemRepo.existsByHash(db, 'a')).toBe(true);
    expect(itemRepo.existsByHash(db, 'b')).toBe(false);
  });

  it('複数の hash を 1 クエリで突合する（一括インポート用）', () => {
    save({ urlHash: 'a' });
    save({ urlHash: 'b' });

    expect(itemRepo.findExistingHashes(db, ['a', 'c', 'b'])).toEqual(new Set(['a', 'b']));
  });

  it('空配列ならクエリを投げずに空を返す', () => {
    expect(itemRepo.findExistingHashes(db, [])).toEqual(new Set());
  });
});

describe('listUnread', () => {
  it('既定は保存日の古い順', () => {
    const old = save({ urlHash: 'old' }, daysAgo(10));
    const recent = save({ urlHash: 'recent' }, daysAgo(1));

    expect(itemRepo.listUnread(db, { now: NOW }).map((i) => i.id)).toEqual([old.id, recent.id]);
  });

  it('新しい順に切り替えられる', () => {
    const old = save({ urlHash: 'old' }, daysAgo(10));
    const recent = save({ urlHash: 'recent' }, daysAgo(1));

    expect(itemRepo.listUnread(db, { order: 'newest', now: NOW }).map((i) => i.id)).toEqual([
      recent.id,
      old.id,
    ]);
  });

  it('スヌーズ中のものは末尾に送る', () => {
    const snoozed = save({ urlHash: 'snoozed' }, daysAgo(30));
    const normal = save({ urlHash: 'normal' }, daysAgo(1));
    itemRepo.snooze(db, snoozed.id, 7, NOW);

    expect(itemRepo.listUnread(db, { now: NOW }).map((i) => i.id)).toEqual([normal.id, snoozed.id]);
  });

  it('スヌーズが明けたら通常の並びに戻る', () => {
    const snoozed = save({ urlHash: 'snoozed' }, daysAgo(30));
    save({ urlHash: 'normal' }, daysAgo(1));
    itemRepo.snooze(db, snoozed.id, 7, NOW);

    const after = new Date(NOW.getTime() + 8 * 24 * 60 * 60 * 1000);
    expect(itemRepo.listUnread(db, { now: after })[0]?.id).toBe(snoozed.id);
  });

  it('read / archived は含まない', () => {
    const read = save({ urlHash: 'r' });
    const archived = save({ urlHash: 'a' });
    save({ urlHash: 'u' });
    itemRepo.markRead(db, read.id, { now: NOW });
    itemRepo.archive(db, archived.id, NOW);

    expect(itemRepo.listUnread(db, { now: NOW })).toHaveLength(1);
  });
});

describe('状態遷移', () => {
  it('markRead で read になり read_logs が積まれる', () => {
    const item = save();
    itemRepo.markRead(db, item.id, { memo: 'async モードの話', now: NOW });

    const row = itemRepo.findById(db, item.id);
    expect(row?.status).toBe('read');
    expect(row?.readAt).toEqual(NOW);
    expect(row?.memo).toBe('async モードの話');
    expect(logsFor(item.id).map((l) => l.event)).toEqual(['saved', 'read']);
  });

  it('markRead はスヌーズを解除する', () => {
    const item = save();
    itemRepo.snooze(db, item.id, 7, NOW);
    itemRepo.markRead(db, item.id, { now: NOW });

    expect(itemRepo.findById(db, item.id)?.snoozedUntil).toBeNull();
  });

  it('メモを渡さなければ既存のメモを消さない', () => {
    const item = save();
    itemRepo.markRead(db, item.id, { memo: '最初のメモ', now: NOW });
    itemRepo.restoreToUnread(db, item.id, NOW);
    itemRepo.markRead(db, item.id, { now: NOW });

    expect(itemRepo.findById(db, item.id)?.memo).toBe('最初のメモ');
  });

  it('archive で archived になり read_logs が積まれる', () => {
    const item = save();
    itemRepo.archive(db, item.id, NOW);

    expect(itemRepo.findById(db, item.id)?.status).toBe('archived');
    expect(logsFor(item.id).map((l) => l.event)).toEqual(['saved', 'archived']);
  });

  it('restoreToUnread で unread に戻り、readAt / archivedAt が消える', () => {
    const item = save();
    itemRepo.markRead(db, item.id, { now: NOW });
    itemRepo.restoreToUnread(db, item.id, NOW);

    const row = itemRepo.findById(db, item.id);
    expect(row?.status).toBe('unread');
    expect(row?.readAt).toBeNull();
    expect(row?.archivedAt).toBeNull();
  });

  // 読了 -> 未読に戻す往復で履歴が消えると週次集計が壊れる
  it('往復しても read_logs にすべての履歴が残る', () => {
    const item = save();
    itemRepo.markRead(db, item.id, { now: NOW });
    itemRepo.restoreToUnread(db, item.id, NOW);
    itemRepo.markRead(db, item.id, { now: NOW });

    expect(logsFor(item.id).map((l) => l.event)).toEqual(['saved', 'read', 'unread', 'read']);
  });

  it('snooze は status を変えない（unread のまま）', () => {
    const item = save();
    itemRepo.snooze(db, item.id, 7, NOW);

    const row = itemRepo.findById(db, item.id);
    expect(row?.status).toBe('unread');
    expect(row?.snoozedUntil).toEqual(new Date(NOW.getTime() + 7 * 24 * 60 * 60 * 1000));
    expect(logsFor(item.id).map((l) => l.event)).toEqual(['saved']);
  });

  it('archiveMany は 1 トランザクションで全件に read_logs を積む', () => {
    const ids = [save({ urlHash: '1' }).id, save({ urlHash: '2' }).id, save({ urlHash: '3' }).id];
    itemRepo.archiveMany(db, ids, NOW);

    expect(db.select().from(items).where(eq(items.status, 'archived')).all()).toHaveLength(3);
    expect(db.select().from(readLogs).where(eq(readLogs.event, 'archived')).all()).toHaveLength(3);
  });

  it('archiveMany に空配列を渡しても何も起きない', () => {
    itemRepo.archiveMany(db, [], NOW);
    expect(db.select().from(readLogs).all()).toHaveLength(0);
  });
});

describe('remove（物理削除）', () => {
  it('archived のものは削除できる', () => {
    const item = save();
    itemRepo.archive(db, item.id, NOW);

    expect(itemRepo.remove(db, item.id)).toBe(true);
    expect(itemRepo.findById(db, item.id)).toBeUndefined();
  });

  it('unread / read は削除できない（docs/DesignDoc.md §4.2）', () => {
    const unread = save({ urlHash: 'u' });
    const read = save({ urlHash: 'r' });
    itemRepo.markRead(db, read.id, { now: NOW });

    expect(itemRepo.remove(db, unread.id)).toBe(false);
    expect(itemRepo.remove(db, read.id)).toBe(false);
    expect(db.select().from(items).all()).toHaveLength(2);
  });

  it('削除しても read_logs の履歴は残る', () => {
    const item = save();
    itemRepo.archive(db, item.id, NOW);
    itemRepo.remove(db, item.id);

    expect(logsFor(item.id)).toHaveLength(2);
  });
});

describe('listStale（放置アイテム）', () => {
  it('30 日を超えた未読だけを返す', () => {
    const stale = save({ urlHash: 'stale' }, daysAgo(31));
    save({ urlHash: 'fresh' }, daysAgo(29));

    expect(itemRepo.listStale(db, { now: NOW }).map((i) => i.id)).toEqual([stale.id]);
  });

  it('境界（ちょうど 30 日）は含む', () => {
    save({ urlHash: 'exact' }, daysAgo(30));
    expect(itemRepo.listStale(db, { now: NOW })).toHaveLength(1);
  });

  // スヌーズは「意図的に先送りした」ものなので放置ではない
  it('スヌーズ中のものは含めない', () => {
    const item = save({ urlHash: 'snoozed' }, daysAgo(40));
    itemRepo.snooze(db, item.id, 7, NOW);

    expect(itemRepo.listStale(db, { now: NOW })).toHaveLength(0);
    expect(itemRepo.countStale(db, { now: NOW })).toBe(0);
  });

  it('read / archived は含まない', () => {
    const read = save({ urlHash: 'r' }, daysAgo(40));
    const archived = save({ urlHash: 'a' }, daysAgo(40));
    itemRepo.markRead(db, read.id, { now: NOW });
    itemRepo.archive(db, archived.id, NOW);

    expect(itemRepo.listStale(db, { now: NOW })).toHaveLength(0);
  });

  it('古い順に返る', () => {
    const older = save({ urlHash: 'older' }, daysAgo(60));
    const newer = save({ urlHash: 'newer' }, daysAgo(40));

    expect(itemRepo.listStale(db, { now: NOW }).map((i) => i.id)).toEqual([older.id, newer.id]);
  });
});

describe('countForLimit / canSave（無料プランの上限）', () => {
  it('archived を数えない（docs/PRD.md §7.5）', () => {
    const archived = save({ urlHash: 'a' });
    save({ urlHash: 'u' });
    const read = save({ urlHash: 'r' });
    itemRepo.archive(db, archived.id, NOW);
    itemRepo.markRead(db, read.id, { now: NOW });

    expect(itemRepo.countForLimit(db)).toBe(2);
  });

  it('上限ちょうどまでは保存でき、超えると保存できない', () => {
    for (let i = 0; i < itemRepo.FREE_PLAN_ITEM_LIMIT - 1; i += 1) {
      save({ urlHash: `h${i}` });
    }
    expect(itemRepo.canSave(db, false)).toBe(true);

    save({ urlHash: 'last' });
    expect(itemRepo.countForLimit(db)).toBe(itemRepo.FREE_PLAN_ITEM_LIMIT);
    expect(itemRepo.canSave(db, false)).toBe(false);
  });

  it('Pro は上限を超えても保存できる', () => {
    for (let i = 0; i < itemRepo.FREE_PLAN_ITEM_LIMIT; i += 1) save({ urlHash: `h${i}` });
    expect(itemRepo.canSave(db, true)).toBe(true);
  });

  it('アーカイブすると枠が空く', () => {
    const ids: string[] = [];
    for (let i = 0; i < itemRepo.FREE_PLAN_ITEM_LIMIT; i += 1)
      ids.push(save({ urlHash: `h${i}` }).id);
    expect(itemRepo.canSave(db, false)).toBe(false);

    itemRepo.archive(db, ids[0]!, NOW);
    expect(itemRepo.canSave(db, false)).toBe(true);
  });
});

describe('bumpToNow（今週読む）', () => {
  it('savedAt を now に更新して放置から外す', () => {
    const item = save({ urlHash: 'old' }, daysAgo(40));
    itemRepo.bumpToNow(db, [item.id], NOW);

    expect(itemRepo.findById(db, item.id)?.savedAt).toEqual(NOW);
    expect(itemRepo.listStale(db, { now: NOW })).toHaveLength(0);
  });

  it('状態は変えない（read_logs にも積まない）', () => {
    const item = save({ urlHash: 'old' }, daysAgo(40));
    itemRepo.bumpToNow(db, [item.id], NOW);

    expect(itemRepo.findById(db, item.id)?.status).toBe('unread');
    expect(logsFor(item.id).map((l) => l.event)).toEqual(['saved']);
  });
});

describe('update', () => {
  it('メタデータを更新し updatedAt を進める', () => {
    const item = save();
    const later = new Date(NOW.getTime() + 60_000);
    itemRepo.update(
      db,
      item.id,
      { title: 'Rails 8 の Solid Queue 入門', metaStatus: 'done' },
      later,
    );

    const row = itemRepo.findById(db, item.id);
    expect(row?.title).toBe('Rails 8 の Solid Queue 入門');
    expect(row?.metaStatus).toBe('done');
    expect(row?.updatedAt).toEqual(later);
  });
});

describe('removeMany（一括削除）', () => {
  it('archived のものだけを 1 トランザクションで消す', () => {
    const archived = [save({ urlHash: 'a1' }).id, save({ urlHash: 'a2' }).id];
    const unread = save({ urlHash: 'u1' }).id;
    for (const id of archived) itemRepo.archive(db, id, NOW);

    expect(itemRepo.removeMany(db, [...archived, unread])).toBe(2);
    expect(itemRepo.findById(db, unread)).toBeDefined();
    for (const id of archived) expect(itemRepo.findById(db, id)).toBeUndefined();
  });

  it('空配列なら 0 件', () => {
    expect(itemRepo.removeMany(db, [])).toBe(0);
  });

  it('削除しても read_logs の履歴は残る', () => {
    const item = save();
    itemRepo.archive(db, item.id, NOW);
    itemRepo.removeMany(db, [item.id]);

    expect(logsFor(item.id)).toHaveLength(2);
  });
});

describe('insertMany（一括インポート）', () => {
  function input(urlHash: string) {
    return {
      url: `https://zenn.dev/${urlHash}`,
      originalUrl: `https://zenn.dev/${urlHash}`,
      urlHash,
      source: 'zenn' as const,
    };
  }

  it('全件を保存し read_logs も積む', () => {
    expect(itemRepo.insertMany(db, [input('a'), input('b'), input('c')], NOW)).toBe(3);

    expect(db.select().from(items).all()).toHaveLength(3);
    expect(db.select().from(readLogs).all()).toHaveLength(3);
  });

  // 途中で失敗したら 1 件も入らない（docs/DesignDoc.md §5.7）
  it('重複があれば全体が失敗し、部分保存にならない', () => {
    itemRepo.insert(db, input('dup'), NOW);

    expect(() => itemRepo.insertMany(db, [input('a'), input('dup'), input('b')], NOW)).toThrow(
      /UNIQUE/i,
    );
    expect(db.select().from(items).all()).toHaveLength(1);
  });

  it('空配列なら 0 件', () => {
    expect(itemRepo.insertMany(db, [], NOW)).toBe(0);
  });
});
