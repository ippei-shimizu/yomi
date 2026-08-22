import { decodeEntities } from './html';
import type { Metadata } from './types';

/**
 * oEmbed レスポンスのパース。
 *
 * 外部 API のレスポンスは信頼できないため、型を仮定せず 1 つずつ検証する。
 */

function asString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** oEmbed の html フィールドからタグを落として本文テキストにする */
export function extractTextFromHtml(html: string): string {
  const withoutTags = html
    // <br> と </p> は改行に、それ以外のタグは削除する
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '');

  return decodeEntities(withoutTags)
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

/**
 * X（publish.twitter.com/oembed）。
 * html から本文テキストを取り出し、author_name を author にする。
 */
export function parseXOembed(payload: unknown): Metadata {
  if (!isRecord(payload)) return {};

  const html = asString(payload['html']);
  const text = html === undefined ? undefined : extractTextFromHtml(html);

  return removeUndefined({
    // 本文が長いことがあるのでタイトルとしては 1 行目相当に切る
    title: text === undefined ? undefined : truncate(firstLine(text), 120),
    description: text,
    author: asString(payload['author_name']),
    siteName: asString(payload['provider_name']) ?? 'X',
  });
}

/** YouTube（youtube.com/oembed）。title と thumbnail_url を使う */
export function parseYouTubeOembed(payload: unknown): Metadata {
  if (!isRecord(payload)) return {};

  return removeUndefined({
    title: asString(payload['title']),
    thumbnailUrl: asString(payload['thumbnail_url']),
    author: asString(payload['author_name']),
    siteName: asString(payload['provider_name']) ?? 'YouTube',
  });
}

function firstLine(text: string): string {
  return text.split('\n')[0] ?? text;
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

function removeUndefined(metadata: Metadata): Metadata {
  return Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => value !== undefined),
  ) as Metadata;
}
