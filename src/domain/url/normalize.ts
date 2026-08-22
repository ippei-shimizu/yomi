/**
 * URL 正規化（docs/DesignDoc.md §5.5）。
 *
 * 同じ記事が別 URL で二重保存されないよう、表記ゆれとトラッキング
 * パラメータを落として一意な形にそろえる。ここで得た文字列の sha256 が
 * items.url_hash になり、重複検知の唯一の判断材料になる。
 */

/** どのホストでも落としてよい、意味を持たないトラッキングパラメータ */
const GLOBAL_TRACKING_PARAMS = new Set(['fbclid', 'gclid', 'ref']);

/**
 * 特定のホストでのみ落とすパラメータ。
 *
 * `s` `t` `igsh` は該当サービスでは純粋なトラッキングだが、一般の Web では
 * 検索クエリなど意味を持つ値に使われる（例: `/search?s=rails`）。全ホストで
 * 落とすと別々の記事が同じ url_hash になり、2 件目以降が「保存済みです」と
 * 誤判定されて保存できなくなる。
 */
const HOST_SCOPED_TRACKING_PARAMS: readonly (readonly [string, ReadonlySet<string>])[] = [
  ['x.com', new Set(['s', 't'])],
  ['instagram.com', new Set(['igsh'])],
  ['threads.net', new Set(['igsh'])],
  ['threads.com', new Set(['igsh'])],
];

/** SFSafariViewController で開く前提のため http(s) 以外は受け付けない */
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

function hostMatches(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

function isTrackingParam(key: string, host: string): boolean {
  if (key.startsWith('utm_')) return true;
  if (GLOBAL_TRACKING_PARAMS.has(key)) return true;

  for (const [domain, params] of HOST_SCOPED_TRACKING_PARAMS) {
    if (hostMatches(host, domain) && params.has(key)) return true;
  }
  return false;
}

/**
 * 正規化した URL を返す。不正な URL、http(s) 以外のスキームは null。
 *
 * 例外を投げないのは、共有シートやインポートの貼り付けテキストという
 * 信頼できない入力を直接受けるため。呼び出し側が null で分岐できる形にする。
 */
export function normalizeUrl(raw: string): string | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }

  // javascript: や file: を弾く。new URL() はこれらを正常にパースするため、
  // ここで落とさないと SFSafariViewController に渡ってしまう。
  if (!ALLOWED_PROTOCOLS.has(u.protocol)) return null;

  u.hostname = u.hostname.toLowerCase().replace(/^(www\.|mobile\.)/, '');
  if (u.hostname === 'twitter.com') u.hostname = 'x.com';

  // keys() は削除で無効化されるため、先に配列へ取り出してから消す
  for (const key of [...u.searchParams.keys()]) {
    if (isTrackingParam(key, u.hostname)) u.searchParams.delete(key);
  }

  u.hash = '';
  u.pathname = u.pathname.replace(/\/+$/, '') || '/';

  return u.toString();
}
