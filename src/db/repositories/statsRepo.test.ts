import { beforeEach, describe, expect, it } from 'vitest';

import { startOfWeek } from '@/domain/date/week';

import { createTestDb, type TestDatabase } from '../testing';
import * as itemRepo from './itemRepo';
import * as statsRepo from './statsRepo';

/** 2026-08-22 は土曜。この週の月曜は 8/17 */
const NOW = new Date('2026-08-22T10:00:00');
const THIS_WEEK = new Date('2026-08-17T00:00:00');
const LAST_WEEK = new Date('2026-08-10T00:00:00');

let db: TestDatabase;
beforeEach(() => {
  db = createTestDb();
});

let seq = 0;
function save(at: Date) {
  seq += 1;
  return itemRepo.insert(
    db,
    {
      url: `https://zenn.dev/${seq}`,
      originalUrl: 'https://zenn.dev/a',
      urlHash: `h${seq}`,
      source: 'zenn',
    },
    at,
  );
}

describe('weeklySummary', () => {
  it('その週に保存・読了した件数を read_logs から数える', () => {
    const a = save(new Date('2026-08-18T09:00:00'));
    save(new Date('2026-08-19T09:00:00'));
    itemRepo.markRead(db, a.id, { now: new Date('2026-08-20T09:00:00') });

    expect(statsRepo.weeklySummary(db, THIS_WEEK)).toEqual({
      weekStart: THIS_WEEK,
      saved: 2,
      read: 1,
      readRate: 0.5,
    });
  });

  it('保存 0 件なら readRate は null（0% と区別する）', () => {
    expect(statsRepo.weeklySummary(db, THIS_WEEK).readRate).toBeNull();
  });

  it('週の境界で正しく振り分ける', () => {
    save(new Date('2026-08-16T23:59:59')); // 日曜 = 先週
    save(new Date('2026-08-17T00:00:00')); // 月曜 = 今週
    save(new Date('2026-08-23T23:59:59')); // 日曜 = 今週
    save(new Date('2026-08-24T00:00:00')); // 月曜 = 来週

    expect(statsRepo.weeklySummary(db, LAST_WEEK).saved).toBe(1);
    expect(statsRepo.weeklySummary(db, THIS_WEEK).saved).toBe(2);
  });

  // items の現在値ではなく履歴から数えるため、往復しても事実は残る
  it('読了 → 未読に戻しても、その週の読了数は減らない', () => {
    const item = save(new Date('2026-08-18T09:00:00'));
    itemRepo.markRead(db, item.id, { now: new Date('2026-08-19T09:00:00') });
    itemRepo.restoreToUnread(db, item.id, new Date('2026-08-20T09:00:00'));

    expect(statsRepo.weeklySummary(db, THIS_WEEK).read).toBe(1);
  });

  it('物理削除しても、その週の集計は変わらない', () => {
    const item = save(new Date('2026-08-18T09:00:00'));
    itemRepo.markRead(db, item.id, { now: new Date('2026-08-19T09:00:00') });
    itemRepo.archive(db, item.id, new Date('2026-08-20T09:00:00'));
    itemRepo.remove(db, item.id);

    expect(statsRepo.weeklySummary(db, THIS_WEEK)).toMatchObject({ saved: 1, read: 1 });
  });

  it('アーカイブは読了に数えない', () => {
    const item = save(new Date('2026-08-18T09:00:00'));
    itemRepo.archive(db, item.id, new Date('2026-08-19T09:00:00'));

    expect(statsRepo.weeklySummary(db, THIS_WEEK)).toMatchObject({ saved: 1, read: 0 });
  });
});

describe('thisWeek / lastWeek', () => {
  it('now を含む週と、その 1 つ前の週を返す', () => {
    save(new Date('2026-08-18T09:00:00'));
    save(new Date('2026-08-11T09:00:00'));

    expect(statsRepo.thisWeek(db, NOW)).toMatchObject({ weekStart: THIS_WEEK, saved: 1 });
    expect(statsRepo.lastWeek(db, NOW)).toMatchObject({ weekStart: LAST_WEEK, saved: 1 });
  });
});

describe('recentWeeks', () => {
  it('古い順に 8 週分返り、末尾が今週', () => {
    const weeks = statsRepo.recentWeeks(db, NOW);

    expect(weeks).toHaveLength(statsRepo.RECENT_WEEKS);
    expect(weeks.at(-1)?.weekStart).toEqual(THIS_WEEK);
    expect(weeks[0]?.weekStart).toEqual(startOfWeek(new Date('2026-06-29T00:00:00')));
  });

  it('データが 1 週分しか無くてもグラフが崩れない（全週が返る）', () => {
    save(new Date('2026-08-18T09:00:00'));
    const weeks = statsRepo.recentWeeks(db, NOW);

    expect(weeks).toHaveLength(8);
    expect(weeks.filter((w) => w.saved > 0)).toHaveLength(1);
    expect(weeks.every((w) => w.readRate === null || typeof w.readRate === 'number')).toBe(true);
  });
});

describe('currentStatus', () => {
  it('未読件数・30 日超件数・平均読むまで日数を返す', () => {
    const old = save(new Date('2026-07-01T09:00:00')); // 52 日前
    save(new Date('2026-08-20T09:00:00'));
    const read = save(new Date('2026-08-12T09:00:00'));
    itemRepo.markRead(db, read.id, { now: new Date('2026-08-22T09:00:00') }); // 10 日

    expect(statsRepo.currentStatus(db, NOW)).toEqual({
      unread: 2,
      stale: 1,
      averageDaysToRead: 10,
    });
    expect(old.status).toBe('unread');
  });

  it('読了実績が無ければ平均は null', () => {
    save(new Date('2026-08-20T09:00:00'));
    expect(statsRepo.currentStatus(db, NOW).averageDaysToRead).toBeNull();
  });

  it('データが無くても壊れない', () => {
    expect(statsRepo.currentStatus(db, NOW)).toEqual({
      unread: 0,
      stale: 0,
      averageDaysToRead: null,
    });
  });
});

describe('readRateBySource', () => {
  function saveWithSource(source: 'x' | 'zenn' | 'qiita', urlHash: string) {
    return itemRepo.insert(
      db,
      { url: `https://e.com/${urlHash}`, originalUrl: 'https://e.com/a', urlHash, source },
      NOW,
    );
  }

  it('ソースごとの読了率を高い順に返す', () => {
    const z1 = saveWithSource('zenn', 'z1');
    saveWithSource('zenn', 'z2');
    const x1 = saveWithSource('x', 'x1');
    saveWithSource('x', 'x2');
    saveWithSource('x', 'x3');
    saveWithSource('x', 'x4');
    itemRepo.markRead(db, z1.id, { now: NOW });
    itemRepo.markRead(db, x1.id, { now: NOW });

    expect(statsRepo.readRateBySource(db)).toEqual([
      { source: 'zenn', total: 2, read: 1, readRate: 0.5 },
      { source: 'x', total: 4, read: 1, readRate: 0.25 },
    ]);
  });

  // アーカイブは「読まずに捨てた」ものなので母数に含める
  it('アーカイブは母数に含めるが読了には数えない', () => {
    const a = saveWithSource('zenn', 'z1');
    const b = saveWithSource('zenn', 'z2');
    itemRepo.markRead(db, a.id, { now: NOW });
    itemRepo.archive(db, b.id, NOW);

    expect(statsRepo.readRateBySource(db)).toEqual([
      { source: 'zenn', total: 2, read: 1, readRate: 0.5 },
    ]);
  });

  it('データが無ければ空配列', () => {
    expect(statsRepo.readRateBySource(db)).toEqual([]);
  });
});

describe("pickCandidates（Today's Pick / 通知）", () => {
  it('未読かつスヌーズ中でないものを返す', () => {
    const normal = save(NOW);
    const snoozed = save(NOW);
    const read = save(NOW);
    itemRepo.snooze(db, snoozed.id, 7, NOW);
    itemRepo.markRead(db, read.id, { now: NOW });

    expect(statsRepo.pickCandidates(db, NOW).map((i) => i.id)).toEqual([normal.id]);
  });

  it('id 順で安定した並びを返す（同じ日に同じ結果を得るため）', () => {
    save(NOW);
    save(NOW);
    save(NOW);

    const first = statsRepo.pickCandidates(db, NOW).map((i) => i.id);
    const second = statsRepo.pickCandidates(db, NOW).map((i) => i.id);
    expect(first).toEqual(second);
    expect([...first].sort()).toEqual(first);
  });
});

describe('listSavedSince（Share Extension での保存を本体が拾う）', () => {
  it('指定時刻より後の saved を source つきで返す', () => {
    save(new Date('2026-08-20T09:00:00'));
    save(new Date('2026-08-21T09:00:00'));

    const result = statsRepo.listSavedSince(db, new Date('2026-08-20T12:00:00'));
    expect(result).toHaveLength(1);
    expect(result[0]?.source).toBe('zenn');
  });

  it('古い順に返る（最後の at を次回の基準にできる）', () => {
    save(new Date('2026-08-20T09:00:00'));
    save(new Date('2026-08-21T09:00:00'));
    save(new Date('2026-08-22T09:00:00'));

    const result = statsRepo.listSavedSince(db, new Date(0));
    const times = result.map((r) => r.at.getTime());
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });

  it('境界（同時刻）は含まない。二重送信を防ぐ', () => {
    const at = new Date('2026-08-20T09:00:00');
    save(at);

    expect(statsRepo.listSavedSince(db, at)).toHaveLength(0);
  });

  it('read / archived のログは含まない', () => {
    const item = save(new Date('2026-08-20T09:00:00'));
    itemRepo.markRead(db, item.id, { now: new Date('2026-08-21T09:00:00') });

    expect(statsRepo.listSavedSince(db, new Date('2026-08-20T12:00:00'))).toHaveLength(0);
  });

  // read_logs には外部キーが無いので、削除済みアイテムのログが残る
  it('物理削除されたアイテムのログは source を取れないので除く', () => {
    const item = save(new Date('2026-08-20T09:00:00'));
    itemRepo.archive(db, item.id, new Date('2026-08-20T10:00:00'));
    itemRepo.remove(db, item.id);

    expect(statsRepo.listSavedSince(db, new Date(0))).toHaveLength(0);
  });
});
