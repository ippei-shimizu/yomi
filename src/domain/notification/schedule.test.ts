import { describe, expect, it } from 'vitest';

import {
  DEFAULT_NOTIFICATION_TIME,
  SCHEDULE_DAYS,
  formatTimeOfDay,
  nextOccurrence,
  occurrencesFor,
  parseTimeOfDay,
} from './schedule';

const NOW = new Date('2026-08-22T10:00:00');

describe('parseTimeOfDay', () => {
  it.each([
    ['08:00', { hour: 8, minute: 0 }],
    ['8:05', { hour: 8, minute: 5 }],
    ['23:59', { hour: 23, minute: 59 }],
    ['00:00', { hour: 0, minute: 0 }],
    ['  08:00  ', { hour: 8, minute: 0 }],
  ])('%s を解釈する', (input, expected) => {
    expect(parseTimeOfDay(input)).toEqual(expected);
  });

  it.each(['24:00', '08:60', '-1:00', '0800', '8', '', 'あ:い'])('%o は null', (input) => {
    expect(parseTimeOfDay(input)).toBeNull();
  });

  it('既定値が解釈できる', () => {
    expect(parseTimeOfDay(DEFAULT_NOTIFICATION_TIME)).toEqual({ hour: 8, minute: 0 });
  });
});

describe('formatTimeOfDay', () => {
  it('0 埋めして返す', () => {
    expect(formatTimeOfDay({ hour: 8, minute: 0 })).toBe('08:00');
    expect(formatTimeOfDay({ hour: 23, minute: 5 })).toBe('23:05');
  });

  it('parse と往復する', () => {
    for (const value of ['00:00', '08:00', '13:45', '23:59']) {
      expect(formatTimeOfDay(parseTimeOfDay(value)!)).toBe(value);
    }
  });
});

describe('nextOccurrence', () => {
  it('今日まだ来ていない時刻は今日になる', () => {
    expect(nextOccurrence({ hour: 18, minute: 0 }, NOW)).toEqual(new Date('2026-08-22T18:00:00'));
  });

  it('すでに過ぎた時刻は翌日になる', () => {
    expect(nextOccurrence({ hour: 8, minute: 0 }, NOW)).toEqual(new Date('2026-08-23T08:00:00'));
  });

  it('ちょうど同時刻は翌日にする（すでに発火済みとみなす）', () => {
    expect(nextOccurrence({ hour: 10, minute: 0 }, NOW)).toEqual(new Date('2026-08-23T10:00:00'));
  });

  it('月をまたぐ', () => {
    const endOfMonth = new Date('2026-08-31T23:00:00');
    expect(nextOccurrence({ hour: 8, minute: 0 }, endOfMonth)).toEqual(
      new Date('2026-09-01T08:00:00'),
    );
  });

  it('秒・ミリ秒を 0 にする', () => {
    const result = nextOccurrence({ hour: 18, minute: 0 }, NOW);
    expect(result.getSeconds()).toBe(0);
    expect(result.getMilliseconds()).toBe(0);
  });
});

describe('occurrencesFor', () => {
  it('1 時刻なら 7 日分', () => {
    const occurrences = occurrencesFor([{ hour: 8, minute: 0 }], NOW);

    expect(occurrences).toHaveLength(SCHEDULE_DAYS);
    expect(occurrences[0]).toEqual(new Date('2026-08-23T08:00:00'));
    expect(occurrences.at(-1)).toEqual(new Date('2026-08-29T08:00:00'));
  });

  it('複数時刻なら時刻数 × 日数（Pro）', () => {
    const occurrences = occurrencesFor(
      [
        { hour: 8, minute: 0 },
        { hour: 21, minute: 0 },
      ],
      NOW,
    );
    expect(occurrences).toHaveLength(SCHEDULE_DAYS * 2);
  });

  it('昇順に整列して返す', () => {
    const occurrences = occurrencesFor(
      [
        { hour: 21, minute: 0 },
        { hour: 8, minute: 0 },
      ],
      NOW,
    );
    const times = occurrences.map((d) => d.getTime());
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });

  it('時刻が空なら何も返さない', () => {
    expect(occurrencesFor([], NOW)).toEqual([]);
  });

  it('すべて未来の日時になる', () => {
    for (const occurrence of occurrencesFor([{ hour: 8, minute: 0 }], NOW)) {
      expect(occurrence.getTime()).toBeGreaterThan(NOW.getTime());
    }
  });
});
