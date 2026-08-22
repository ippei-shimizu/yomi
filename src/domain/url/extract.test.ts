import { describe, expect, it } from 'vitest';
import { extractFirstUrl, extractUrls } from './extract';

describe('extractUrls', () => {
  it('テキスト中の URL を出現順に返す', () => {
    const text = 'これ良かった https://zenn.dev/a と https://qiita.com/b';
    expect(extractUrls(text)).toEqual(['https://zenn.dev/a', 'https://qiita.com/b']);
  });

  it('改行・空白区切りを扱える（URL 一括インポート）', () => {
    const text = 'https://zenn.dev/a\nhttps://x.com/b\t https://note.com/c\n\n';
    expect(extractUrls(text)).toHaveLength(3);
  });

  it('文末の句読点や閉じ括弧を URL に含めない', () => {
    expect(extractUrls('詳細は https://zenn.dev/a.')).toEqual(['https://zenn.dev/a']);
    expect(extractUrls('（https://zenn.dev/a）')).toEqual(['https://zenn.dev/a']);
    expect(extractUrls('参考: https://zenn.dev/a, https://qiita.com/b!')).toEqual([
      'https://zenn.dev/a',
      'https://qiita.com/b',
    ]);
  });

  it('クエリやフラグメントを含む URL を途中で切らない', () => {
    expect(extractUrls('https://zenn.dev/a?b=1&c=2#d')).toEqual(['https://zenn.dev/a?b=1&c=2#d']);
  });

  it('重複は除かない（呼び出し側で url_hash により判定する）', () => {
    expect(extractUrls('https://zenn.dev/a https://zenn.dev/a')).toHaveLength(2);
  });

  it('URL が無ければ空配列', () => {
    expect(extractUrls('ただのテキスト')).toEqual([]);
    expect(extractUrls('')).toEqual([]);
  });

  it('http(s) 以外のスキームは拾わない', () => {
    expect(extractUrls('javascript:alert(1) file:///etc/passwd')).toEqual([]);
  });

  // インポートでは数万文字が貼り付けられうる。線形時間で終わること
  it('大量の入力でも現実的な時間で終わる', () => {
    const text = Array.from({ length: 5000 }, (_, i) => `https://zenn.dev/a/${i}`).join('\n');
    const started = performance.now();
    const urls = extractUrls(text);
    expect(urls).toHaveLength(5000);
    expect(performance.now() - started).toBeLessThan(1000);
  });
});

describe('extractFirstUrl', () => {
  it('最初の URL を返す', () => {
    expect(extractFirstUrl('a https://zenn.dev/1 b https://zenn.dev/2')).toBe('https://zenn.dev/1');
  });

  it('URL が無ければ null', () => {
    expect(extractFirstUrl('テキストのみ')).toBeNull();
  });
});

describe('extractUrls: 閉じ括弧を含む URL', () => {
  // 開き括弧が対応している分は URL の一部として残す
  it('Wikipedia の括弧つき URL を壊さない', () => {
    const url = 'https://ja.wikipedia.org/wiki/Ruby_(プログラミング言語)';
    expect(extractUrls(`参考 ${url}`)).toEqual([url]);
  });

  it('対応する開き括弧が無い閉じ括弧は落とす', () => {
    expect(extractUrls('(see https://zenn.dev/a)')).toEqual(['https://zenn.dev/a']);
  });

  it('括弧つき URL のあとの句読点だけを落とす', () => {
    const url = 'https://en.wikipedia.org/wiki/Ruby_(programming_language)';
    expect(extractUrls(`${url}.`)).toEqual([url]);
  });

  it('角括弧・波括弧も同じ規則で扱う', () => {
    expect(extractUrls('https://example.com/a[1]')).toEqual(['https://example.com/a[1]']);
    expect(extractUrls('[https://example.com/a]')).toEqual(['https://example.com/a']);
  });
});
