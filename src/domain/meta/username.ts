import type { Metadata } from './types';

/**
 * Instagram / Threads は**メタを取得しない**（ログイン必須で取れないため）。
 * URL からユーザー名だけを抜いてタイトルにする。
 */

/** /@foo/... または /foo/p/... の先頭セグメントを拾う */
const USERNAME_SEGMENT = /^\/@?([A-Za-z0-9._]{1,30})(?:\/|$)/;

/** Instagram の投稿種別。ユーザー名ではないので除外する */
const RESERVED_SEGMENTS = new Set(['p', 'reel', 'reels', 'tv', 'stories', 'explore']);

export function extractUsername(url: string): string | undefined {
  let pathname: string;
  try {
    pathname = new URL(url).pathname;
  } catch {
    return undefined;
  }

  const match = USERNAME_SEGMENT.exec(pathname);
  const username = match?.[1];
  if (username === undefined) return undefined;
  if (RESERVED_SEGMENTS.has(username.toLowerCase())) return undefined;

  return username;
}

export function metadataFromUsername(url: string, siteName: string): Metadata {
  const username = extractUsername(url);
  return username === undefined
    ? { siteName }
    : { title: `@${username}`, author: username, siteName };
}
