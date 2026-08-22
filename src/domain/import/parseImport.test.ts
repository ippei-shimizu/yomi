import { describe, expect, it } from 'vitest';

import { urlHash } from '@/domain/url';

import { limitToRemaining, parseImportText } from './parseImport';

const EMPTY = new Set<string>();

describe('parseImportText', () => {
  it('改行区切りの URL を拾う', () => {
    const preview = parseImportText('https://zenn.dev/a\nhttps://qiita.com/b', EMPTY);

    expect(preview.fresh.map((u) => u.url)).toEqual(['https://zenn.dev/a', 'https://qiita.com/b']);
    expect(preview.duplicateCount).toBe(0);
  });

  it('空白・タブ区切りでも拾う', () => {
    const preview = parseImportText('https://zenn.dev/a \t https://qiita.com/b', EMPTY);
    expect(preview.fresh).toHaveLength(2);
  });

  it('URL 以外のテキストが混ざっても拾える', () => {
    const preview = parseImportText(
      'ブックマーク一覧\n1. https://zenn.dev/a （Rails）\n2. https://qiita.com/b',
      EMPTY,
    );
    expect(preview.fresh).toHaveLength(2);
  });

  it('保存時に正規化される', () => {
    const preview = parseImportText('https://www.zenn.dev/a/?utm_source=x#s', EMPTY);

    expect(preview.fresh[0]?.url).toBe('https://zenn.dev/a');
    // 元の URL は入力どおり残す
    expect(preview.fresh[0]?.originalUrl).toBe('https://www.zenn.dev/a/?utm_source=x#s');
  });

  it('ソースを判定する', () => {
    const preview = parseImportText('https://x.com/foo/status/1', EMPTY);
    expect(preview.fresh[0]?.source).toBe('x');
  });

  describe('重複', () => {
    it('既存の hash と重なるものを除く', () => {
      const existing = new Set([urlHash('https://zenn.dev/a')]);
      const preview = parseImportText('https://zenn.dev/a\nhttps://qiita.com/b', existing);

      expect(preview.fresh).toHaveLength(1);
      expect(preview.duplicateCount).toBe(1);
    });

    // 同じ URL を 2 回貼り付けても 1 件しか保存しない
    it('入力テキスト内の重複も除く', () => {
      const preview = parseImportText('https://zenn.dev/a\nhttps://zenn.dev/a', EMPTY);

      expect(preview.fresh).toHaveLength(1);
      expect(preview.duplicateCount).toBe(1);
    });

    it('正規化して同じになるものも重複扱い', () => {
      const preview = parseImportText(
        'https://twitter.com/foo/status/1?s=20\nhttps://x.com/foo/status/1',
        EMPTY,
      );

      expect(preview.fresh).toHaveLength(1);
      expect(preview.duplicateCount).toBe(1);
    });
  });

  describe('不正な入力', () => {
    it('URL が無ければ空', () => {
      expect(parseImportText('ただのテキスト', EMPTY)).toEqual({
        fresh: [],
        duplicateCount: 0,
        invalidCount: 0,
      });
    });

    // extractUrls が http(s) のみ拾うため、そもそも抽出されない
    it('危険なスキームは拾わない', () => {
      const preview = parseImportText('javascript:alert(1) file:///etc/passwd', EMPTY);
      expect(preview.fresh).toHaveLength(0);
    });

    it('空文字でも壊れない', () => {
      expect(parseImportText('', EMPTY).fresh).toEqual([]);
    });
  });

  // 数万文字が貼り付けられうる
  it('1,000 件の URL を現実的な時間で解析できる', () => {
    const text = Array.from({ length: 1_000 }, (_, i) => `https://zenn.dev/a/${i}`).join('\n');

    const started = performance.now();
    const preview = parseImportText(text, EMPTY);

    expect(preview.fresh).toHaveLength(1_000);
    expect(performance.now() - started).toBeLessThan(2_000);
  });
});

describe('limitToRemaining', () => {
  const preview = parseImportText(
    Array.from({ length: 10 }, (_, i) => `https://zenn.dev/a/${i}`).join('\n'),
    EMPTY,
  );

  it('残り件数まで切り詰める', () => {
    expect(limitToRemaining(preview, 3).fresh).toHaveLength(3);
  });

  it('Pro（null）なら切り詰めない', () => {
    expect(limitToRemaining(preview, null).fresh).toHaveLength(10);
  });

  it('残りが十分なら切り詰めない', () => {
    expect(limitToRemaining(preview, 50).fresh).toHaveLength(10);
  });

  it('残り 0 なら 1 件も通さない', () => {
    expect(limitToRemaining(preview, 0).fresh).toHaveLength(0);
  });
});
