import { describe, expect, it } from 'vitest';
import { detectSource } from './source';
import { normalizeUrl } from './normalize';

describe('detectSource', () => {
  it.each([
    ['https://x.com/foo/status/1', 'x'],
    ['https://twitter.com/foo/status/1', 'x'],
    ['https://instagram.com/p/abc', 'instagram'],
    ['https://www.instagram.com/reel/abc', 'instagram'],
    ['https://threads.net/@foo/post/1', 'threads'],
    ['https://threads.com/@foo/post/1', 'threads'],
    ['https://zenn.dev/foo/articles/bar', 'zenn'],
    ['https://qiita.com/foo/items/bar', 'qiita'],
    ['https://note.com/foo/n/bar', 'note'],
    ['https://medium.com/@foo/bar', 'medium'],
    ['https://youtube.com/watch?v=abc', 'youtube'],
    ['https://youtu.be/abc', 'youtube'],
    ['https://m.youtube.com/watch?v=abc', 'youtube'],
  ] as const)('%s -> %s', (url, expected) => {
    expect(detectSource(url)).toBe(expected);
  });

  it.each([
    'https://example.com/a',
    'https://blog.example.co.jp/entry/1',
    'https://developer.mozilla.org/ja/docs/Web',
  ])('未知のホスト %s は web に落とす', (url) => {
    expect(detectSource(url)).toBe('web');
  });

  it('サブドメインも同じソースとして扱う', () => {
    expect(detectSource('https://info.zenn.dev/a')).toBe('zenn');
  });

  // ドメインの部分一致で誤判定しないこと
  it.each(['https://notzenn.dev/a', 'https://x.com.evil.example/a', 'https://fake-medium.com/a'])(
    '似たホスト %s を誤判定しない',
    (url) => {
      expect(detectSource(url)).toBe('web');
    },
  );

  it('不正な URL でも例外を投げず web を返す', () => {
    expect(detectSource('not a url')).toBe('web');
    expect(detectSource('')).toBe('web');
  });

  it('正規化後の URL でも判定できる', () => {
    const normalized = normalizeUrl('https://mobile.twitter.com/foo/status/1?s=20');
    expect(normalized).not.toBeNull();
    expect(detectSource(normalized!)).toBe('x');
  });
});
