import { describe, expect, it, vi } from 'vitest';

import { fallbackTitle, fetchMetadata, readAtMost } from './fetchMetadata';
import { MAX_HTML_BYTES } from './types';

function htmlResponse(html: string, init: ResponseInit = {}): Response {
  return new Response(html, { status: 200, headers: { 'content-type': 'text/html' }, ...init });
}

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

const OGP_HTML = '<head><meta property="og:title" content="Solid Queue 入門"></head>';

describe('fetchMetadata: ソース別の戦略', () => {
  it('一般 Web は HTML を取得して OGP を読む', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(htmlResponse(OGP_HTML));
    const result = await fetchMetadata('https://zenn.dev/a', { fetchImpl });

    expect(result).toEqual({ ok: true, metadata: { title: 'Solid Queue 入門' } });
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it('Safari 相当の User-Agent を送る', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(htmlResponse(OGP_HTML));
    await fetchMetadata('https://zenn.dev/a', { fetchImpl });

    const headers = fetchImpl.mock.calls[0]?.[1]?.headers as Record<string, string>;
    expect(headers['User-Agent']).toContain('Safari');
  });

  it('X は publish.twitter.com の oEmbed を叩く', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({ html: '<p>本文</p>', author_name: 'Foo' }));
    const result = await fetchMetadata('https://x.com/foo/status/1', { fetchImpl });

    expect(fetchImpl.mock.calls[0]?.[0]).toContain('publish.twitter.com/oembed');
    expect(fetchImpl.mock.calls[0]?.[0]).toContain('omit_script=1');
    expect(result).toMatchObject({ ok: true, metadata: { author: 'Foo' } });
  });

  it('YouTube は youtube.com の oEmbed を叩く', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ title: '動画' }));
    const result = await fetchMetadata('https://youtu.be/abc', { fetchImpl });

    expect(fetchImpl.mock.calls[0]?.[0]).toContain('youtube.com/oembed');
    expect(result).toMatchObject({ ok: true, metadata: { title: '動画' } });
  });

  // ログイン必須で取得できないため、そもそもネットワークに出ない
  it.each([
    ['https://instagram.com/foo/p/abc', 'Instagram'],
    ['https://threads.net/@bar/post/1', 'Threads'],
  ])('%s は fetch せず URL からユーザー名を作る', async (url, siteName) => {
    const fetchImpl = vi.fn();
    const result = await fetchMetadata(url, { fetchImpl });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result).toMatchObject({ ok: true, metadata: { siteName } });
  });

  it('URL がクエリとして正しくエスケープされる', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({}));
    await fetchMetadata('https://x.com/foo/status/1?a=b&c=d', { fetchImpl });

    expect(fetchImpl.mock.calls[0]?.[0]).toContain(
      encodeURIComponent('https://x.com/foo/status/1?a=b&c=d'),
    );
  });
});

describe('fetchMetadata: 失敗の扱い', () => {
  it('HTTP エラーは http', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('', { status: 404 }));
    expect(await fetchMetadata('https://zenn.dev/a', { fetchImpl })).toEqual({
      ok: false,
      reason: 'http',
    });
  });

  it('ネットワークエラーは network', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    expect(await fetchMetadata('https://zenn.dev/a', { fetchImpl })).toEqual({
      ok: false,
      reason: 'network',
    });
  });

  it('タイムアウトは timeout', async () => {
    const abortError = new Error('aborted');
    abortError.name = 'AbortError';
    const fetchImpl = vi.fn().mockRejectedValue(abortError);

    expect(await fetchMetadata('https://zenn.dev/a', { fetchImpl })).toEqual({
      ok: false,
      reason: 'timeout',
    });
  });

  it('JSON が壊れていれば parse', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('not json', { status: 200 }));
    expect(await fetchMetadata('https://x.com/foo/status/1', { fetchImpl })).toEqual({
      ok: false,
      reason: 'parse',
    });
  });

  it('タイムアウト時に AbortSignal を渡している', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(htmlResponse(OGP_HTML));
    await fetchMetadata('https://zenn.dev/a', { fetchImpl, timeoutMs: 100 });

    expect(fetchImpl.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it('OGP が無い HTML でも失敗にはしない（空のメタを返す）', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(htmlResponse('<html><body>本文</body></html>'));
    expect(await fetchMetadata('https://zenn.dev/a', { fetchImpl })).toEqual({
      ok: true,
      metadata: {},
    });
  });
});

describe('readAtMost（256KB で打ち切る）', () => {
  it('上限より短ければ全部読む', async () => {
    expect(await readAtMost(new Response('short'), MAX_HTML_BYTES)).toBe('short');
  });

  // 上限が無いと、巨大なページで端末のメモリを食い潰す
  it('上限を超える本文は途中で打ち切る', async () => {
    const huge = 'a'.repeat(MAX_HTML_BYTES * 2);
    const text = await readAtMost(new Response(huge), MAX_HTML_BYTES);

    expect(text.length).toBeLessThanOrEqual(MAX_HTML_BYTES);
    expect(text.length).toBeGreaterThan(0);
  });

  it('body が無いレスポンスでも壊れない', async () => {
    const response = new Response(null, { status: 204 });
    expect(await readAtMost(response, MAX_HTML_BYTES)).toBe('');
  });

  it('打ち切った先頭に OGP があれば読める', async () => {
    const html = `<head><meta property="og:title" content="先頭"></head><body>${'x'.repeat(MAX_HTML_BYTES * 2)}</body>`;
    const text = await readAtMost(new Response(html), MAX_HTML_BYTES);

    expect(text).toContain('og:title');
  });
});

describe('fallbackTitle', () => {
  it('ホスト名を返す（メタ取得に失敗したときの表示）', () => {
    expect(fallbackTitle('https://zenn.dev/foo/articles/bar')).toBe('zenn.dev');
  });

  it('不正な URL ならそのまま返す', () => {
    expect(fallbackTitle('not a url')).toBe('not a url');
  });
});
