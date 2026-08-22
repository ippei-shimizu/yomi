import { describe, expect, it } from 'vitest';
import { normalizeUrl } from './normalize';
import { urlHash } from './hash';

describe('normalizeUrl', () => {
  describe('ホスト名', () => {
    it.each([
      ['https://WWW.Zenn.DEV/foo', 'https://zenn.dev/foo'],
      ['https://www.zenn.dev/foo', 'https://zenn.dev/foo'],
      ['https://mobile.twitter.com/foo', 'https://x.com/foo'],
    ])('%s を %s に正規化する', (input, expected) => {
      expect(normalizeUrl(input)).toBe(expected);
    });

    it('twitter.com を x.com に統一する', () => {
      expect(normalizeUrl('https://twitter.com/foo/status/1')).toBe('https://x.com/foo/status/1');
    });
  });

  describe('トラッキングパラメータ', () => {
    it('utm_* をすべて落とす', () => {
      expect(normalizeUrl('https://zenn.dev/a?utm_source=x&utm_medium=social&utm_campaign=c')).toBe(
        'https://zenn.dev/a',
      );
    });

    it('fbclid / gclid / ref を落とす', () => {
      expect(normalizeUrl('https://example.com/a?fbclid=1&gclid=2&ref=3')).toBe(
        'https://example.com/a',
      );
    });

    it('意味のあるクエリは残す', () => {
      expect(normalizeUrl('https://zenn.dev/search?q=rails&page=2')).toBe(
        'https://zenn.dev/search?q=rails&page=2',
      );
    });

    it('x.com の s / t は落とす', () => {
      expect(normalizeUrl('https://x.com/foo/status/1?s=20&t=abc')).toBe(
        'https://x.com/foo/status/1',
      );
    });

    // s / t を全ホストで落とすと、別々の検索結果ページが同じ url_hash になり
    // 2 件目以降が重複扱いで保存できなくなる
    it('一般 Web の s / t は残す', () => {
      expect(normalizeUrl('https://example.com/search?s=rails')).toBe(
        'https://example.com/search?s=rails',
      );
      expect(normalizeUrl('https://example.com/video?t=120')).toBe(
        'https://example.com/video?t=120',
      );
    });

    it('instagram の igsh は落とすが、一般 Web では残す', () => {
      expect(normalizeUrl('https://instagram.com/p/abc?igsh=xyz')).toBe(
        'https://instagram.com/p/abc',
      );
      expect(normalizeUrl('https://example.com/p?igsh=xyz')).toBe('https://example.com/p?igsh=xyz');
    });

    it('パラメータが全部消えたら ? も残さない', () => {
      expect(normalizeUrl('https://zenn.dev/a?utm_source=x')).toBe('https://zenn.dev/a');
    });
  });

  describe('パス・フラグメント', () => {
    it('末尾スラッシュを落とす', () => {
      expect(normalizeUrl('https://zenn.dev/foo/')).toBe('https://zenn.dev/foo');
      expect(normalizeUrl('https://zenn.dev/foo///')).toBe('https://zenn.dev/foo');
    });

    it('ルートのスラッシュは残す', () => {
      expect(normalizeUrl('https://zenn.dev/')).toBe('https://zenn.dev/');
      expect(normalizeUrl('https://zenn.dev')).toBe('https://zenn.dev/');
    });

    it('フラグメントを落とす', () => {
      expect(normalizeUrl('https://zenn.dev/foo#section-2')).toBe('https://zenn.dev/foo');
    });

    it('パスの大文字小文字は保持する（パスは case-sensitive）', () => {
      expect(normalizeUrl('https://zenn.dev/Foo/Bar')).toBe('https://zenn.dev/Foo/Bar');
    });
  });

  describe('不正な入力', () => {
    it.each(['', '   ', 'not a url', 'zenn.dev/foo', '///', 'http://'])(
      '%o は null を返す',
      (input) => {
        expect(normalizeUrl(input)).toBeNull();
      },
    );

    // new URL() は javascript: を正常にパースするため、明示的に弾かないと
    // SFSafariViewController に渡ってしまう
    it.each([
      'javascript:alert(1)',
      'file:///etc/passwd',
      'data:text/html,<script>alert(1)</script>',
      'yomi://item/1',
      'ftp://example.com/a',
    ])('%s は http(s) でないため null を返す', (input) => {
      expect(normalizeUrl(input)).toBeNull();
    });

    it('前後の空白を無視する', () => {
      expect(normalizeUrl('  https://zenn.dev/foo  ')).toBe('https://zenn.dev/foo');
    });
  });

  describe('重複検知（url_hash が一致すること）', () => {
    it('twitter.com と x.com の同じ投稿が同じ hash になる', () => {
      const a = normalizeUrl('https://twitter.com/foo/status/1?s=20');
      const b = normalizeUrl('https://x.com/foo/status/1');
      expect(a).not.toBeNull();
      expect(a).toBe(b);
      expect(urlHash(a!)).toBe(urlHash(b!));
    });

    it('www 有無・末尾スラッシュ・utm の差を吸収する', () => {
      const variants = [
        'https://www.zenn.dev/foo/articles/bar/',
        'https://zenn.dev/foo/articles/bar',
        'https://zenn.dev/foo/articles/bar/?utm_source=x#head',
      ].map((v) => normalizeUrl(v));

      expect(new Set(variants).size).toBe(1);
      expect(variants[0]).toBe('https://zenn.dev/foo/articles/bar');
    });

    it('別々の記事は別の hash になる', () => {
      const a = normalizeUrl('https://zenn.dev/foo/articles/one');
      const b = normalizeUrl('https://zenn.dev/foo/articles/two');
      expect(urlHash(a!)).not.toBe(urlHash(b!));
    });
  });
});

describe('urlHash', () => {
  it('sha256 の既知のテストベクタと一致する', () => {
    // sha256("abc")
    expect(urlHash('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('64 文字の 16 進数を返す', () => {
    expect(urlHash('https://zenn.dev/foo')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('同じ入力に対して安定している', () => {
    expect(urlHash('https://zenn.dev/foo')).toBe(urlHash('https://zenn.dev/foo'));
  });
});
