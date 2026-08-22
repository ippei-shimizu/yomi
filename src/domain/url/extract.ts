/**
 * テキストから URL を抽出する。
 *
 * 共有シートは URL ではなくテキストを渡してくることがあり、URL 一括インポートも
 * 貼り付けテキストから拾う。
 */

/**
 * 量指定子のネストが無く入力長に対して線形。インポートでは数万文字が
 * 貼り付けられうるため、catastrophic backtracking を起こす形にしない。
 */
const URL_PATTERN = /https?:\/\/[^\s<>"'）】」]+/g;

/** 常に落としてよい文末記号 */
const TRAILING_PUNCTUATION = /[.,;:!?]+$/;

/** 閉じ括弧と、対応する開き括弧 */
const BRACKET_PAIRS: readonly (readonly [close: string, open: string])[] = [
  [')', '('],
  [']', '['],
  ['}', '{'],
];

/**
 * 文末の句読点や閉じ括弧は URL の一部でないことが多いので落とす。
 * 「詳細は https://zenn.dev/a. 」「（https://zenn.dev/a）」のようなケース。
 *
 * ただし閉じ括弧は URL 自体に含まれることがある
 * （例: https://ja.wikipedia.org/wiki/Ruby_(プログラミング言語) ）。
 * 開き括弧が対応して存在する分は URL の一部とみなして残す。
 */
function trimTrailingNoise(url: string): string {
  let result = url.replace(TRAILING_PUNCTUATION, '');

  for (;;) {
    const last = result.at(-1);
    const pair = BRACKET_PAIRS.find(([close]) => close === last);
    if (!pair) break;

    const [close, open] = pair;
    const closeCount = result.split(close).length - 1;
    const openCount = result.split(open).length - 1;
    if (closeCount <= openCount) break;

    result = result.slice(0, -1).replace(TRAILING_PUNCTUATION, '');
  }

  return result;
}

/** テキスト中に現れる順に URL を返す。重複は除かない */
export function extractUrls(text: string): string[] {
  return (text.match(URL_PATTERN) ?? []).map(trimTrailingNoise).filter((u) => u.length > 0);
}

/** 最初に見つかった URL。無ければ null */
export function extractFirstUrl(text: string): string | null {
  return extractUrls(text)[0] ?? null;
}
