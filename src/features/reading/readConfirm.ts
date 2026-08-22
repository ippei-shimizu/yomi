/**
 * 読了確認の判定。
 * react-native を import しない純粋モジュール。
 */

/** これ未満の滞在で閉じたら読了確認を出さない（誤タップ対策） */
export const MIN_DWELL_MS = 10_000;

/** 同じアイテムで「まだ」を何回選んだら「あとで」を提案するか */
export const NOT_YET_SUGGESTION_THRESHOLD = 3;

export type ConfirmDecision = 'ask' | 'skip-short-dwell' | 'skip-setting-off';

/**
 * ブラウザを閉じた直後に読了確認を出すか。
 *
 * @param dwellMs ブラウザに滞在していた時間
 * @param readConfirmEnabled Settings の「読了確認シート」（既定 ON）
 */
export function decideConfirm(dwellMs: number, readConfirmEnabled: boolean): ConfirmDecision {
  if (!readConfirmEnabled) return 'skip-setting-off';
  if (dwellMs < MIN_DWELL_MS) return 'skip-short-dwell';
  return 'ask';
}

/** 「まだ」の回数が閾値に達したら「あとでにしますか？」を提案する */
export function shouldSuggestSnooze(notYetCount: number): boolean {
  return notYetCount >= NOT_YET_SUGGESTION_THRESHOLD;
}

/** 空白だけのメモは保存しない。null にして「メモなし」と同じ扱いにする */
export function normalizeMemo(input: string): string | undefined {
  const trimmed = input.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
