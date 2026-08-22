import { describe, expect, it } from 'vitest';

import { extractTextFromHtml, parseXOembed, parseYouTubeOembed } from './oembed';

/** publish.twitter.com/oembed の実レスポンスに近い形 */
const X_RESPONSE = {
  url: 'https://twitter.com/foo/status/1',
  author_name: 'Foo Bar',
  author_url: 'https://twitter.com/foo',
  html: '<blockquote class="twitter-tweet"><p lang="ja" dir="ltr">Rails 8 の Solid Queue がよかった<br>とくに async モード</p>&mdash; Foo Bar (@foo)</blockquote>',
  provider_name: 'Twitter',
};

const YOUTUBE_RESPONSE = {
  title: 'Solid Queue の解説',
  author_name: 'Some Channel',
  thumbnail_url: 'https://i.ytimg.com/vi/abc/hqdefault.jpg',
  provider_name: 'YouTube',
};

describe('parseXOembed', () => {
  it('html から本文を取り出し author_name を author にする', () => {
    const meta = parseXOembed(X_RESPONSE);

    expect(meta.author).toBe('Foo Bar');
    expect(meta.description).toContain('Rails 8 の Solid Queue がよかった');
    expect(meta.description).toContain('async モード');
    expect(meta.title).toBe('Rails 8 の Solid Queue がよかった');
  });

  it('タグが本文に残らない', () => {
    expect(parseXOembed(X_RESPONSE).description).not.toMatch(/<[a-z]/i);
  });

  it('provider_name が無ければ X を使う', () => {
    expect(parseXOembed({ html: '<p>a</p>' }).siteName).toBe('X');
  });

  it('長い本文はタイトル側だけ切り詰める', () => {
    const long = 'あ'.repeat(300);
    const meta = parseXOembed({ html: `<p>${long}</p>` });

    expect(meta.title?.length).toBeLessThanOrEqual(120);
    expect(meta.title?.endsWith('…')).toBe(true);
    expect(meta.description?.length).toBe(300);
  });

  describe('信頼できないレスポンス', () => {
    it.each([null, undefined, 'string', 42, []])('%o でも例外を投げない', (payload) => {
      expect(() => parseXOembed(payload)).not.toThrow();
    });

    it('html が文字列でなければ本文を作らない', () => {
      expect(parseXOembed({ html: 12345, author_name: 'Foo' })).toEqual({
        author: 'Foo',
        siteName: 'X',
      });
    });

    it('空文字のフィールドは無いものとして扱う', () => {
      expect(parseXOembed({ author_name: '   ', html: '' }).author).toBeUndefined();
    });
  });
});

describe('parseYouTubeOembed', () => {
  it('title と thumbnail_url を拾う', () => {
    expect(parseYouTubeOembed(YOUTUBE_RESPONSE)).toEqual({
      title: 'Solid Queue の解説',
      thumbnailUrl: 'https://i.ytimg.com/vi/abc/hqdefault.jpg',
      author: 'Some Channel',
      siteName: 'YouTube',
    });
  });

  it.each([null, 'string', []])('%o でも例外を投げない', (payload) => {
    expect(() => parseYouTubeOembed(payload)).not.toThrow();
  });
});

describe('extractTextFromHtml', () => {
  it('<br> と </p> を改行にする', () => {
    expect(extractTextFromHtml('<p>1行目<br>2行目</p><p>3行目</p>')).toBe('1行目\n2行目\n3行目');
  });

  it('エンティティを復元する', () => {
    expect(extractTextFromHtml('<p>A &amp; B</p>')).toBe('A & B');
  });

  it('タグだけの入力は空になる', () => {
    expect(extractTextFromHtml('<div><span></span></div>')).toBe('');
  });
});
