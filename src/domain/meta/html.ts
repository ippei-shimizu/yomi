/**
 * OGP / <title> の抽出。
 *
 * 外部サイトの HTML という信頼できない入力を扱うため、正規表現は
 * 量指定子をネストさせず入力長に対して線形になる形だけを使う。
 * DOM パーサを持ち込まないのは、React Native と Share Extension の
 * 双方で動かす必要があり、依存を増やしたくないため。
 */

import type { Metadata } from './types';

/** 属性を含む meta タグ 1 つ。`[^>]*` はネストが無く線形 */
const META_TAG = /<meta\s[^>]*>/gi;
const TITLE_TAG = /<title[^>]*>([^<]*)<\/title>/i;
const HEAD_END = /<\/head\s*>/i;

/** name="og:title" / property='og:title' / content=... の 3 形式に対応 */
const ATTRIBUTE = /([a-zA-Z-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g;

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  '#39': "'",
  nbsp: ' ',
};

/** HTML エンティティを戻す。数値参照にも対応する */
export function decodeEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, entity: string) => {
    const named = NAMED_ENTITIES[entity.toLowerCase()];
    if (named !== undefined) return named;

    if (entity.startsWith('#x') || entity.startsWith('#X')) {
      const code = Number.parseInt(entity.slice(2), 16);
      return Number.isNaN(code) ? match : safeFromCodePoint(code, match);
    }
    if (entity.startsWith('#')) {
      const code = Number.parseInt(entity.slice(1), 10);
      return Number.isNaN(code) ? match : safeFromCodePoint(code, match);
    }
    return match;
  });
}

function safeFromCodePoint(code: number, fallback: string): string {
  // 範囲外のコードポイントは String.fromCodePoint が例外を投げる
  if (code < 0 || code > 0x10ffff) return fallback;
  return String.fromCodePoint(code);
}

function parseAttributes(tag: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  ATTRIBUTE.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = ATTRIBUTE.exec(tag)) !== null) {
    const key = match[1]?.toLowerCase();
    const value = match[3] ?? match[4] ?? match[5];
    if (key !== undefined && value !== undefined) attributes[key] = value;
  }
  return attributes;
}

function clean(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = decodeEntities(value).replace(/\s+/g, ' ').trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * OGP を拾い、無ければ <title> にフォールバックする（docs/DesignDoc.md §5.2）。
 *
 * head の終わりで打ち切る。body 内の meta タグは OGP ではないうえ、
 * 走査量を減らせる。
 */
export function parseHtmlMetadata(html: string): Metadata {
  const head = html.split(HEAD_END)[0] ?? html;

  const og: Record<string, string> = {};
  META_TAG.lastIndex = 0;

  let tag: RegExpExecArray | null;
  while ((tag = META_TAG.exec(head)) !== null) {
    const attributes = parseAttributes(tag[0]);
    // OGP は property、Twitter Card や標準 meta は name を使う
    const key = attributes['property'] ?? attributes['name'];
    const content = attributes['content'];
    if (key !== undefined && content !== undefined && og[key] === undefined) {
      og[key] = content;
    }
  }

  const title =
    clean(og['og:title']) ?? clean(og['twitter:title']) ?? clean(TITLE_TAG.exec(head)?.[1]);

  return removeUndefined({
    title,
    description: clean(og['og:description']) ?? clean(og['description']),
    thumbnailUrl: clean(og['og:image']) ?? clean(og['twitter:image']),
    siteName: clean(og['og:site_name']),
    author: clean(og['article:author']) ?? clean(og['author']),
  });
}

function removeUndefined(metadata: Metadata): Metadata {
  return Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => value !== undefined),
  ) as Metadata;
}
