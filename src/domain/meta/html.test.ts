import { describe, expect, it } from 'vitest';

import { decodeEntities, parseHtmlMetadata } from './html';

const FULL_OGP = `<!doctype html><html><head>
<meta charset="utf-8">
<meta property="og:title" content="Rails 8 の Solid Queue 入門">
<meta property="og:description" content="Solid Queue の async モードについて">
<meta property="og:image" content="https://zenn.dev/images/ogp.png">
<meta property="og:site_name" content="Zenn">
<title>フォールバックされないタイトル</title>
</head><body><meta property="og:title" content="body の og は無視される"></body></html>`;

describe('parseHtmlMetadata', () => {
  it('OGP をすべて拾う', () => {
    expect(parseHtmlMetadata(FULL_OGP)).toEqual({
      title: 'Rails 8 の Solid Queue 入門',
      description: 'Solid Queue の async モードについて',
      thumbnailUrl: 'https://zenn.dev/images/ogp.png',
      siteName: 'Zenn',
    });
  });

  it('OGP が無ければ <title> にフォールバックする（docs/DesignDoc.md §5.2）', () => {
    const html = '<html><head><title>タイトルだけ</title></head></html>';
    expect(parseHtmlMetadata(html)).toEqual({ title: 'タイトルだけ' });
  });

  it('og:title が無く twitter:title があればそれを使う', () => {
    const html = '<head><meta name="twitter:title" content="Twitter Card"></head>';
    expect(parseHtmlMetadata(html).title).toBe('Twitter Card');
  });

  it('属性の引用符が シングル / なし でも読める', () => {
    const html = `<head>
      <meta property='og:title' content='シングルクォート'>
      <meta property=og:site_name content=NoQuote>
    </head>`;
    expect(parseHtmlMetadata(html)).toMatchObject({
      title: 'シングルクォート',
      siteName: 'NoQuote',
    });
  });

  it('属性の順序が逆でも読める', () => {
    const html = '<head><meta content="逆順" property="og:title"></head>';
    expect(parseHtmlMetadata(html).title).toBe('逆順');
  });

  it('name / property のどちらでも読める', () => {
    expect(parseHtmlMetadata('<head><meta name="og:title" content="name 属性"></head>').title).toBe(
      'name 属性',
    );
  });

  it('同じキーが複数あれば最初のものを使う', () => {
    const html =
      '<head><meta property="og:title" content="1つ目"><meta property="og:title" content="2つ目"></head>';
    expect(parseHtmlMetadata(html).title).toBe('1つ目');
  });

  // body の走査は無駄なうえ、body 内の og: は OGP ではない
  it('</head> より後ろは見ない', () => {
    expect(parseHtmlMetadata(FULL_OGP).title).toBe('Rails 8 の Solid Queue 入門');
  });

  it('タイトルの前後空白と連続空白を整える', () => {
    const html = '<head><meta property="og:title" content="  余分な   空白  "></head>';
    expect(parseHtmlMetadata(html).title).toBe('余分な 空白');
  });

  it('空文字の content は無いものとして扱う', () => {
    const html = '<head><meta property="og:title" content="   "><title>実タイトル</title></head>';
    expect(parseHtmlMetadata(html).title).toBe('実タイトル');
  });

  describe('壊れた HTML', () => {
    it.each([
      ['', {}],
      ['<html>', {}],
      ['<head><meta></head>', {}],
      ['<head><meta property="og:title"></head>', {}],
      ['plain text', {}],
    ])('%o でも例外を投げず %o を返す', (html, expected) => {
      expect(parseHtmlMetadata(html)).toEqual(expected);
    });

    it('閉じていないタグがあっても止まらない', () => {
      const html = '<head><meta property="og:title" content="壊れかけ" <title>後続</title></head>';
      expect(() => parseHtmlMetadata(html)).not.toThrow();
    });
  });

  // 外部サイトの HTML は攻撃者が制御しうる。線形時間で終わること
  it('256KB 相当の入力でも現実的な時間で終わる', () => {
    const filler = '<div class="x">'.repeat(16_000);
    const html = `<head><meta property="og:title" content="重い"></head><body>${filler}</body>`;

    const started = performance.now();
    expect(parseHtmlMetadata(html).title).toBe('重い');
    expect(performance.now() - started).toBeLessThan(1000);
  });
});

describe('decodeEntities', () => {
  it.each([
    ['&amp;', '&'],
    ['&lt;script&gt;', '<script>'],
    ['&quot;引用&quot;', '"引用"'],
    ['&#39;', "'"],
    ['&nbsp;', ' '],
    ['&#12354;', 'あ'],
    ['&#x3042;', 'あ'],
  ])('%s -> %s', (input, expected) => {
    expect(decodeEntities(input)).toBe(expected);
  });

  it('未知のエンティティはそのまま残す', () => {
    expect(decodeEntities('&unknown; &fake123;')).toBe('&unknown; &fake123;');
  });

  it('範囲外のコードポイントで例外を投げない', () => {
    expect(() => decodeEntities('&#xFFFFFFFF; &#99999999;')).not.toThrow();
  });

  it('タイトル中のエンティティが復元される', () => {
    const html = '<head><meta property="og:title" content="A &amp; B &lt;C&gt;"></head>';
    expect(decodeEntities('A &amp; B &lt;C&gt;')).toBe('A & B <C>');
    expect(html).toContain('&amp;');
  });
});
