/**
 * Today's Pick の選択（docs/DesignDoc.md §5.6）。
 *
 * 日付をシードにするため、同じ日は何度呼んでも同じアイテムが返る。
 * 通知（#14）も同じ関数を nonce=0 で使うので、通知とホームの
 * Today's Pick は必ず一致する。
 */

/** FNV-1a 32bit。暗号用途ではなく、日付から安定した数値を得るためだけに使う */
export function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    // 32bit の FNV prime 乗算。Math.imul で桁あふれを避ける
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** 日付をローカルタイムで YYYY-MM-DD にする。シードに使う */
export function dateKeyOf(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function pickToday<T>(candidates: readonly T[], dateKey: string, nonce = 0): T | null {
  if (candidates.length === 0) return null;
  const seed = fnv1a(`${dateKey}:${nonce}`);
  return candidates[seed % candidates.length] ?? null;
}
