import { describe, expect, it } from 'vitest';

import {
  barRatios,
  formatAverageDays,
  formatDelta,
  formatRate,
  formatRateDelta,
  formatWeekRange,
  formatWeekTick,
  weekEndOf,
  weekBars,
} from './format';

describe('formatRate', () => {
  it.each([
    [0, '0%'],
    [0.375, '38%'],
    [0.5, '50%'],
    [1, '100%'],
  ])('%f -> %s', (rate, expected) => {
    expect(formatRate(rate)).toBe(expected);
  });

  // 0% と「データなし」を区別する
  it('null は — にする', () => {
    expect(formatRate(null)).toBe('—');
  });
});

describe('formatDelta（先週比）', () => {
  it.each([
    [8, 6, '▲2'],
    [3, 4, '▼1'],
    [0, 5, '▼5'],
  ])('%i vs %i -> %s', (current, previous, expected) => {
    expect(formatDelta(current, previous)).toBe(expected);
  });

  it('差が無ければ何も出さない', () => {
    expect(formatDelta(5, 5)).toBe('');
  });
});

describe('formatRateDelta', () => {
  it('ポイント差で出す', () => {
    expect(formatRateDelta(0.38, 0.53)).toBe('▼15pt');
    expect(formatRateDelta(0.5, 0.4)).toBe('▲10pt');
  });

  it('どちらかがデータなしなら何も出さない', () => {
    expect(formatRateDelta(null, 0.5)).toBe('');
    expect(formatRateDelta(0.5, null)).toBe('');
  });

  it('差が無ければ何も出さない', () => {
    expect(formatRateDelta(0.5, 0.5)).toBe('');
  });
});

// docs/DesignGuideline.md §7 / §9
describe('煽らない表示', () => {
  it('感嘆符・絵文字を含まない', () => {
    const outputs = [
      formatRate(1),
      formatDelta(10, 0),
      formatRateDelta(1, 0),
      formatAverageDays(1),
    ];
    for (const output of outputs) {
      expect(output).not.toMatch(/[!！🎉🔥⭐]/u);
    }
  });
});

describe('週ラベル', () => {
  it('週の範囲を出す', () => {
    expect(formatWeekRange(new Date('2026-08-17T00:00:00'))).toBe('8/17 –');
    expect(formatWeekTick(new Date('2026-08-17T00:00:00'))).toBe('8/17');
  });

  it('週の終わりは日曜', () => {
    const end = weekEndOf(new Date('2026-08-17T00:00:00'));
    expect(end).toEqual(new Date('2026-08-23T00:00:00'));
    expect(end.getDay()).toBe(0);
  });
});

describe('formatAverageDays', () => {
  it('四捨五入して日数を出す', () => {
    expect(formatAverageDays(11.4)).toBe('11 日');
    expect(formatAverageDays(11.6)).toBe('12 日');
  });

  it('実績なしは —', () => {
    expect(formatAverageDays(null)).toBe('—');
  });
});

describe('barRatios', () => {
  it('最大値を 1 として比を返す', () => {
    expect(barRatios([2, 4, 8])).toEqual([0.25, 0.5, 1]);
  });

  // データが 1 週分しか無くてもグラフが崩れないこと
  it('全て 0 でも壊れない', () => {
    expect(barRatios([0, 0, 0])).toEqual([0, 0, 0]);
  });

  it('空配列でも壊れない', () => {
    expect(barRatios([])).toEqual([]);
  });

  it('1 件だけなら 1', () => {
    expect(barRatios([5])).toEqual([1]);
  });
});

describe('weekBars（保存と読了を共通の最大値で正規化）', () => {
  it('最大値を基準に高さを出す', () => {
    const bars = weekBars(
      [
        { saved: 10, read: 5 },
        { saved: 5, read: 5 },
      ],
      100,
    );

    expect(bars[0]).toEqual({ savedHeight: 100, readHeight: 50 });
    expect(bars[1]).toEqual({ savedHeight: 50, readHeight: 50 });
  });

  // 別々に正規化すると、読了 1 件の週と保存 10 件の週が同じ高さになる
  it('読了だけを別に正規化しない', () => {
    const bars = weekBars(
      [
        { saved: 10, read: 1 },
        { saved: 1, read: 1 },
      ],
      100,
    );

    expect(bars[0]?.readHeight).toBe(10);
    expect(bars[1]?.readHeight).toBe(10);
  });

  it('全て 0 でも壊れない', () => {
    expect(weekBars([{ saved: 0, read: 0 }], 100)).toEqual([{ savedHeight: 0, readHeight: 0 }]);
  });

  it('読了が保存を上回っても（週をまたいだ読了）高さが枠を超えない', () => {
    const bars = weekBars([{ saved: 2, read: 5 }], 100);
    expect(bars[0]?.readHeight).toBeLessThanOrEqual(100);
    expect(bars[0]?.savedHeight).toBeLessThanOrEqual(100);
  });

  it('空配列でも壊れない', () => {
    expect(weekBars([], 100)).toEqual([]);
  });
});
