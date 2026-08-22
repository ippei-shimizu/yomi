import { beforeEach, describe, expect, it } from 'vitest';

import { itemRepo, tagRepo } from '@/db/repositories';
import { createTestDb, type TestDatabase } from '@/db/testing';
import { urlHash } from '@/domain/url';

import { LIMIT_WARNING_REMAINING, limitsFor, remainingSaves, shouldWarnAboutLimit } from './plan';

const NOW = new Date('2026-08-22T10:00:00');

let db: TestDatabase;
beforeEach(() => {
  db = createTestDb();
});

function fill(count: number) {
  for (let i = 0; i < count; i += 1) {
    const url = `https://zenn.dev/a/${i}`;
    itemRepo.insert(db, { url, originalUrl: url, urlHash: urlHash(url), source: 'zenn' }, NOW);
  }
}

describe('limitsFor', () => {
  it('無料プランの上限', () => {
    expect(limitsFor(false)).toEqual({
      itemLimit: itemRepo.FREE_PLAN_ITEM_LIMIT,
      tagLimit: tagRepo.FREE_PLAN_TAG_LIMIT,
      multipleNotificationTimes: false,
      memoSearch: false,
      staleBulkAction: false,
      urlImport: false,
    });
  });

  it('Pro は上限なし', () => {
    expect(limitsFor(true)).toEqual({
      itemLimit: null,
      tagLimit: null,
      multipleNotificationTimes: true,
      memoSearch: true,
      staleBulkAction: true,
      urlImport: true,
    });
  });

  it('エクスポートは無料でも使える（表に無い = 制限しない）', () => {
    expect(Object.keys(limitsFor(false))).not.toContain('export');
  });
});

describe('remainingSaves', () => {
  it('残り件数を返す', () => {
    fill(45);
    expect(remainingSaves(db, false)).toBe(5);
  });

  it('上限到達なら 0（負にしない）', () => {
    fill(itemRepo.FREE_PLAN_ITEM_LIMIT + 3);
    expect(remainingSaves(db, false)).toBe(0);
  });

  it('Pro は null', () => {
    fill(100);
    expect(remainingSaves(db, true)).toBeNull();
  });

  it('アーカイブすると残りが増える', () => {
    fill(itemRepo.FREE_PLAN_ITEM_LIMIT);
    expect(remainingSaves(db, false)).toBe(0);

    const first = itemRepo.listUnread(db, { now: NOW })[0]!;
    itemRepo.archive(db, first.id, NOW);
    expect(remainingSaves(db, false)).toBe(1);
  });
});

describe('shouldWarnAboutLimit', () => {
  it.each([0, 1, LIMIT_WARNING_REMAINING])('残り %i 件なら警告する', (remaining) => {
    expect(shouldWarnAboutLimit(remaining)).toBe(true);
  });

  it.each([LIMIT_WARNING_REMAINING + 1, 20, 50])('残り %i 件なら警告しない', (remaining) => {
    expect(shouldWarnAboutLimit(remaining)).toBe(false);
  });

  it('Pro（null）なら警告しない', () => {
    expect(shouldWarnAboutLimit(null)).toBe(false);
  });
});
