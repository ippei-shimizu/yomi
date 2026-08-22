/**
 * 保存元の種別。docs/DesignDoc.md §4.1 の items.source と一致させる。
 * 色の割り当ては docs/DesignGuideline.md §2.3 を参照。
 */
export const SOURCES = [
  'x',
  'instagram',
  'threads',
  'zenn',
  'qiita',
  'note',
  'medium',
  'youtube',
  'web',
] as const;

export type Source = (typeof SOURCES)[number];

/**
 * ホスト名からソースを判定する。判定できないものはすべて 'web'。
 *
 * 対応表は docs/PRD.md §7.1。medium は独自ドメインで運用されることが
 * あるが、ホスト名からは判別できないため 'web' に落ちる。
 */
const HOST_TO_SOURCE: readonly (readonly [string, Source])[] = [
  ['x.com', 'x'],
  ['twitter.com', 'x'],
  ['instagram.com', 'instagram'],
  ['threads.net', 'threads'],
  ['threads.com', 'threads'],
  ['zenn.dev', 'zenn'],
  ['qiita.com', 'qiita'],
  ['note.com', 'note'],
  ['medium.com', 'medium'],
  ['youtube.com', 'youtube'],
  ['youtu.be', 'youtube'],
];

/** ホスト名が対象ドメインそのものか、そのサブドメインか */
function hostMatches(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

export function detectSource(url: string): Source {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    // 正規化を通っていない不正な URL。呼び出し側で弾かれている想定だが、
    // ここで例外にはせず 'web' に倒す。
    return 'web';
  }

  for (const [domain, source] of HOST_TO_SOURCE) {
    if (hostMatches(host, domain)) return source;
  }
  return 'web';
}
