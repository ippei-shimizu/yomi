/**
 * 購入エラーの判定。react-native も RevenueCat も import しない純粋モジュール。
 */

/**
 * ユーザーが自分で購入をやめた場合かどうか。
 *
 * RevenueCat はキャンセルも例外として投げてくるので、これを区別せずに
 * 扱うと「購入できませんでした」を自分でやめた人にまで見せてしまう。
 */
export function isUserCancelled(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as Record<string, unknown>)['userCancelled'] === true
  );
}
