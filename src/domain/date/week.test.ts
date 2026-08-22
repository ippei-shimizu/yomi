import { describe, expect, it } from 'vitest';

import { addDays, daysBetween, recentWeekStarts, startOfDay, startOfWeek } from './week';

/** ローカルタイム（テストは TZ=Asia/Tokyo 固定）での Date */
function local(iso: string): Date {
  return new Date(iso);
}

describe('startOfWeek（週起点は月曜固定）', () => {
  it.each([
    ['2026-08-17T00:00:00', '月曜そのもの'],
    ['2026-08-17T23:59:59', '月曜の深夜'],
    ['2026-08-20T12:00:00', '木曜'],
    ['2026-08-23T23:59:59', '日曜の深夜'],
  ])('%s (%s) は 8/17 の週', (iso) => {
    expect(startOfWeek(local(iso))).toEqual(local('2026-08-17T00:00:00'));
  });

  it('日曜は前の週に属する（月曜起点なので 6 日前の月曜）', () => {
    expect(startOfWeek(local('2026-08-16T12:00:00'))).toEqual(local('2026-08-10T00:00:00'));
  });

  it('月曜 00:00 ちょうどで週が切り替わる', () => {
    expect(startOfWeek(local('2026-08-16T23:59:59'))).toEqual(local('2026-08-10T00:00:00'));
    expect(startOfWeek(local('2026-08-17T00:00:00'))).toEqual(local('2026-08-17T00:00:00'));
  });

  it('月をまたいでも正しい', () => {
    expect(startOfWeek(local('2026-09-02T12:00:00'))).toEqual(local('2026-08-31T00:00:00'));
  });

  it('年をまたいでも正しい', () => {
    expect(startOfWeek(local('2027-01-01T12:00:00'))).toEqual(local('2026-12-28T00:00:00'));
  });
});

describe('startOfDay', () => {
  it('時刻を 00:00:00.000 に落とす', () => {
    expect(startOfDay(local('2026-08-20T23:59:59.999'))).toEqual(local('2026-08-20T00:00:00.000'));
  });

  it('引数を破壊しない', () => {
    const input = local('2026-08-20T12:34:56');
    startOfDay(input);
    expect(input).toEqual(local('2026-08-20T12:34:56'));
  });
});

describe('daysBetween（放置日数）', () => {
  it('同じ日は 0', () => {
    expect(daysBetween(local('2026-08-20T00:00:00'), local('2026-08-20T23:59:59'))).toBe(0);
  });

  // ミリ秒差では 2 分しか経っていないが、日付は変わっているので 1 日
  it('日付境界をまたげば 1 日として数える', () => {
    expect(daysBetween(local('2026-08-20T23:59:00'), local('2026-08-21T00:01:00'))).toBe(1);
  });

  it('7 日超・30 日超のバッジ判定の境界', () => {
    const saved = local('2026-08-01T10:00:00');
    expect(daysBetween(saved, local('2026-08-08T09:00:00'))).toBe(7);
    expect(daysBetween(saved, local('2026-08-31T09:00:00'))).toBe(30);
    expect(daysBetween(saved, local('2026-09-01T09:00:00'))).toBe(31);
  });

  it('未来の日付は負になる', () => {
    expect(daysBetween(local('2026-08-21T00:00:00'), local('2026-08-20T00:00:00'))).toBe(-1);
  });
});

describe('addDays', () => {
  it('月をまたぐ', () => {
    expect(addDays(local('2026-08-31T12:00:00'), 1)).toEqual(local('2026-09-01T12:00:00'));
  });

  it('負の値で戻る', () => {
    expect(addDays(local('2026-09-01T12:00:00'), -1)).toEqual(local('2026-08-31T12:00:00'));
  });

  it('引数を破壊しない', () => {
    const input = local('2026-08-20T12:00:00');
    addDays(input, 7);
    expect(input).toEqual(local('2026-08-20T12:00:00'));
  });
});

describe('recentWeekStarts（Stats の直近 8 週）', () => {
  it('古い順に返り、末尾が現在の週', () => {
    const weeks = recentWeekStarts(local('2026-08-20T12:00:00'), 8);

    expect(weeks).toHaveLength(8);
    expect(weeks.at(-1)).toEqual(local('2026-08-17T00:00:00'));
    expect(weeks[0]).toEqual(local('2026-06-29T00:00:00'));
    expect([...weeks].sort((a, b) => a.getTime() - b.getTime())).toEqual(weeks);
  });

  it('1 週なら現在の週だけ', () => {
    expect(recentWeekStarts(local('2026-08-20T12:00:00'), 1)).toEqual([
      local('2026-08-17T00:00:00'),
    ]);
  });

  it('0 以下なら空', () => {
    expect(recentWeekStarts(local('2026-08-20T12:00:00'), 0)).toEqual([]);
  });
});
