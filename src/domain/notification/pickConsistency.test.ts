import { beforeEach, describe, expect, it } from 'vitest';

import { itemRepo, statsRepo } from '@/db/repositories';
import { createTestDb, type TestDatabase } from '@/db/testing';
import { dateKeyOf, pickToday } from '@/domain/pick/pickToday';
import { urlHash } from '@/domain/url';

/**
 * 通知とホームの Today's Pick が一致すること（docs/DesignDoc.md §5.6）。
 *
 * 通知（notifications.ts）とホーム（useTodaysPick）は別々の場所で
 * pickToday を呼ぶ。同じ候補・同じ dateKey・nonce=0 なら必ず同じ
 * アイテムになる、という前提をここで固定する。
 */
const NOW = new Date('2026-08-22T10:00:00');

let db: TestDatabase;
beforeEach(() => {
  db = createTestDb();
});

let seq = 0;
function save(savedAt = NOW) {
  seq += 1;
  const url = `https://zenn.dev/a/${seq}`;
  return itemRepo.insert(
    db,
    { url, originalUrl: url, urlHash: urlHash(url), source: 'zenn' },
    savedAt,
  );
}

describe("通知とホームの Today's Pick", () => {
  it('同じ候補・同じ日なら同じアイテムを選ぶ', () => {
    for (let i = 0; i < 10; i += 1) save();

    const candidates = statsRepo.pickCandidates(db, NOW);
    const forNotification = pickToday(candidates, dateKeyOf(NOW));
    const forHome = pickToday(statsRepo.pickCandidates(db, NOW), dateKeyOf(NOW));

    expect(forNotification?.id).toBe(forHome?.id);
  });

  // 候補の並び順が変わると別のアイテムが選ばれてしまう
  it('候補の並びが呼び出しごとに安定している', () => {
    for (let i = 0; i < 20; i += 1) save();

    const first = statsRepo.pickCandidates(db, NOW).map((i) => i.id);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect(statsRepo.pickCandidates(db, NOW).map((i) => i.id)).toEqual(first);
    }
  });

  it('未読が 0 件なら選ばれない（通知しない）', () => {
    expect(pickToday(statsRepo.pickCandidates(db, NOW), dateKeyOf(NOW))).toBeNull();
  });

  it('スヌーズ中のアイテムは候補に入らない', () => {
    const snoozed = save();
    itemRepo.snooze(db, snoozed.id, 7, NOW);

    expect(statsRepo.pickCandidates(db, NOW)).toHaveLength(0);
  });

  it('読了・アーカイブしたアイテムは候補に入らない', () => {
    const read = save();
    const archived = save();
    save();
    itemRepo.markRead(db, read.id, { now: NOW });
    itemRepo.archive(db, archived.id, NOW);

    expect(statsRepo.pickCandidates(db, NOW)).toHaveLength(1);
  });

  it('候補が変われば選ばれるアイテムも追随する', () => {
    for (let i = 0; i < 5; i += 1) save();
    const before = pickToday(statsRepo.pickCandidates(db, NOW), dateKeyOf(NOW));
    expect(before).not.toBeNull();

    // 選ばれていたものを読了にすると、別のアイテムが選ばれる
    itemRepo.markRead(db, before!.id, { now: NOW });
    const after = pickToday(statsRepo.pickCandidates(db, NOW), dateKeyOf(NOW));

    expect(after?.id).not.toBe(before?.id);
  });
});
