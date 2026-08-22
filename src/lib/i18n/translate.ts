/**
 * 文言の差し込みと複数形の解決。react-native を import しない純粋モジュール。
 */

/** 差し込む値。数値は count として複数形の判定にも使う */
export type TranslateParams = Record<string, string | number>;

/**
 * `{name}` を params の値で置き換える。
 *
 * 対応する値が無いプレースホルダは、そのまま残さず空文字にする。
 * 画面に `{remaining}` と出るより、抜けている方がまだ気づかれにくい害が小さい。
 */
export function interpolate(template: string, params: TranslateParams | undefined): string {
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => {
    const value = params?.[key];
    return value === undefined ? '' : String(value);
  });
}

/**
 * 複数形を選ぶ。`key_one` / `key_other` が定義されているキーにだけ適用する。
 *
 * 日本語には複数形が無いので ja のメッセージは `_other` だけを持つ。
 * en は 1 件のときだけ `_one` を使う。
 */
export function pluralKey(
  key: string,
  params: TranslateParams | undefined,
  has: (candidate: string) => boolean,
): string {
  const other = `${key}_other`;
  const count = params?.['count'];

  // count が無くても、複数形しか定義が無いキーなら _other に倒す。
  // ここで素通りさせると、画面にキーそのものが出る
  if (typeof count !== 'number') return has(key) ? key : other;

  if (count === 1 && has(`${key}_one`)) return `${key}_one`;
  return has(other) ? other : key;
}
