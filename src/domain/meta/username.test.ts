import { describe, expect, it } from 'vitest';

import { extractUsername, metadataFromUsername } from './username';

describe('extractUsername', () => {
  it.each([
    ['https://instagram.com/foo', 'foo'],
    ['https://instagram.com/foo/', 'foo'],
    ['https://instagram.com/foo/p/abc', 'foo'],
    ['https://threads.net/@bar', 'bar'],
    ['https://threads.net/@bar/post/1', 'bar'],
    ['https://instagram.com/some.user_1', 'some.user_1'],
  ])('%s -> %s', (url, expected) => {
    expect(extractUsername(url)).toBe(expected);
  });

  // /p/ や /reel/ は投稿種別でユーザー名ではない
  it.each([
    'https://instagram.com/p/abc',
    'https://instagram.com/reel/abc',
    'https://instagram.com/explore/tags/rails',
  ])('%s は種別セグメントなので拾わない', (url) => {
    expect(extractUsername(url)).toBeUndefined();
  });

  it.each(['https://instagram.com/', 'https://instagram.com', 'not a url', ''])(
    '%o は undefined',
    (url) => {
      expect(extractUsername(url)).toBeUndefined();
    },
  );
});

describe('metadataFromUsername', () => {
  it('@username をタイトルにする（docs/DesignDoc.md §5.2）', () => {
    expect(metadataFromUsername('https://instagram.com/foo/p/abc', 'Instagram')).toEqual({
      title: '@foo',
      author: 'foo',
      siteName: 'Instagram',
    });
  });

  it('ユーザー名を取れなければ siteName だけ返す', () => {
    expect(metadataFromUsername('https://instagram.com/p/abc', 'Instagram')).toEqual({
      siteName: 'Instagram',
    });
  });
});
