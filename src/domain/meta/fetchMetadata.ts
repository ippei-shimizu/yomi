import { detectSource } from '@/domain/url';

import { parseHtmlMetadata } from './html';
import { parseXOembed, parseYouTubeOembed } from './oembed';
import { FETCH_TIMEOUT_MS, MAX_HTML_BYTES, type Metadata } from './types';
import { metadataFromUsername } from './username';

/**
 * ソース別のメタデータ取得。
 *
 * 取得そのものはここに閉じ、パースは pure function 側に置く。
 * リトライと件数の制御は MetaFetchWorker が持つ。
 */

/** OGP を返すサイトが多いので Safari 相当を名乗る */
const USER_AGENT =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

export type FetchFailureReason = 'network' | 'http' | 'timeout' | 'parse';

export type FetchResult =
  { ok: true; metadata: Metadata } | { ok: false; reason: FetchFailureReason };

type FetchLike = typeof globalThis.fetch;

export type FetchOptions = {
  fetchImpl?: FetchLike;
  timeoutMs?: number;
};

export async function fetchMetadata(url: string, options: FetchOptions = {}): Promise<FetchResult> {
  const source = detectSource(url);

  switch (source) {
    case 'x':
      return fetchJsonMetadata(
        `https://publish.twitter.com/oembed?omit_script=1&url=${encodeURIComponent(url)}`,
        parseXOembed,
        options,
      );
    case 'youtube':
      return fetchJsonMetadata(
        `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`,
        parseYouTubeOembed,
        options,
      );
    // ログイン必須でメタを取得できないため、ネットワークに出ない
    case 'instagram':
      return { ok: true, metadata: metadataFromUsername(url, 'Instagram') };
    case 'threads':
      return { ok: true, metadata: metadataFromUsername(url, 'Threads') };
    default:
      return fetchHtmlMetadata(url, options);
  }
}

async function fetchJsonMetadata(
  endpoint: string,
  parse: (payload: unknown) => Metadata,
  options: FetchOptions,
): Promise<FetchResult> {
  const response = await request(endpoint, { accept: 'application/json' }, options);
  if (!response.ok) return response;

  try {
    return { ok: true, metadata: parse(JSON.parse(await response.value.text())) };
  } catch {
    return { ok: false, reason: 'parse' };
  }
}

async function fetchHtmlMetadata(url: string, options: FetchOptions): Promise<FetchResult> {
  const response = await request(url, { accept: 'text/html' }, options);
  if (!response.ok) return response;

  try {
    const html = await readAtMost(response.value, MAX_HTML_BYTES);
    return { ok: true, metadata: parseHtmlMetadata(html) };
  } catch {
    return { ok: false, reason: 'parse' };
  }
}

type RequestResult =
  { ok: true; value: Response } | { ok: false; reason: Exclude<FetchFailureReason, 'parse'> };

async function request(
  url: string,
  headers: { accept: string },
  { fetchImpl = globalThis.fetch, timeoutMs = FETCH_TIMEOUT_MS }: FetchOptions,
): Promise<RequestResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: headers.accept },
      signal: controller.signal,
      redirect: 'follow',
    });
    if (!response.ok) return { ok: false, reason: 'http' };
    return { ok: true, value: response };
  } catch (error) {
    return { ok: false, reason: isAbortError(error) ? 'timeout' : 'network' };
  } finally {
    clearTimeout(timer);
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

/**
 * 先頭 max バイトだけ読む。
 *
 * response.text() は本文全体をメモリに載せるため、サイズ上限のない
 * サイトに当たると Extension でなくとも危険。ストリームを途中で切る。
 */
export async function readAtMost(response: Response, max: number): Promise<string> {
  const body = response.body;
  if (!body) {
    // ストリームが取れない環境では読み込んでから切り詰める
    return (await response.text()).slice(0, max);
  }

  const reader = body.getReader();
  const decoder = new TextDecoder('utf-8');
  const chunks: string[] = [];
  let received = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      const remaining = max - received;
      if (value.byteLength >= remaining) {
        chunks.push(decoder.decode(value.subarray(0, remaining)));
        break;
      }
      received += value.byteLength;
      chunks.push(decoder.decode(value, { stream: true }));
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }

  return chunks.join('');
}

/** メタが取れなかったときの表示用フォールバック */
export function fallbackTitle(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
