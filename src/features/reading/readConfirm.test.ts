import { describe, expect, it } from 'vitest';

import {
  MIN_DWELL_MS,
  NOT_YET_SUGGESTION_THRESHOLD,
  decideConfirm,
  normalizeMemo,
  shouldSuggestSnooze,
} from './readConfirm';

describe('decideConfirm', () => {
  it('十分に滞在していれば確認を出す', () => {
    expect(decideConfirm(MIN_DWELL_MS, true)).toBe('ask');
    expect(decideConfirm(60_000, true)).toBe('ask');
  });

  // 誤タップで開いてすぐ閉じたときに確認が出るのは煩わしい
  it('滞在 10 秒未満なら出さない', () => {
    expect(decideConfirm(0, true)).toBe('skip-short-dwell');
    expect(decideConfirm(MIN_DWELL_MS - 1, true)).toBe('skip-short-dwell');
  });

  it('設定が OFF なら滞在時間によらず出さない', () => {
    expect(decideConfirm(60_000, false)).toBe('skip-setting-off');
    expect(decideConfirm(0, false)).toBe('skip-setting-off');
  });
});

describe('shouldSuggestSnooze', () => {
  it.each([0, 1, 2])('「まだ」が %i 回なら提案しない', (count) => {
    expect(shouldSuggestSnooze(count)).toBe(false);
  });

  it.each([3, 4, 10])('「まだ」が %i 回なら提案する', (count) => {
    expect(shouldSuggestSnooze(count)).toBe(true);
  });

  it('閾値は 3（docs/Screens.md S05）', () => {
    expect(NOT_YET_SUGGESTION_THRESHOLD).toBe(3);
  });
});

describe('normalizeMemo', () => {
  it('前後の空白を落とす', () => {
    expect(normalizeMemo('  async モードの話  ')).toBe('async モードの話');
  });

  it.each(['', '   ', '\n\t '])('%o は undefined（メモなし扱い）', (input) => {
    expect(normalizeMemo(input)).toBeUndefined();
  });

  it('改行を含むメモはそのまま残す', () => {
    expect(normalizeMemo('1行目\n2行目')).toBe('1行目\n2行目');
  });
});
