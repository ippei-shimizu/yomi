import { describe, expect, it } from 'vitest';

import { displayTitle, relativeDays, subtitleOf, unreadHeadline } from './display';

const NOW = new Date('2026-08-22T10:00:00');

describe('displayTitle', () => {
  it('タイトルがあればそれを使う', () => {
    expect(displayTitle({ title: 'Solid Queue 入門', url: 'https://zenn.dev/a' })).toBe(
      'Solid Queue 入門',
    );
  });

  // メタ取得前・失敗時のフォールバック（docs/DesignDoc.md §5.2）
  it.each([null, '', '   '])('タイトルが %o ならホスト名にする', (title) => {
    expect(displayTitle({ title, url: 'https://zenn.dev/foo/articles/bar' })).toBe('zenn.dev');
  });

  it('URL も不正ならそのまま出す', () => {
    expect(displayTitle({ title: null, url: 'broken' })).toBe('broken');
  });
});

describe('subtitleOf', () => {
  it('author があれば @author を出す', () => {
    expect(
      subtitleOf(
        { siteName: 'X', author: 'foo', url: 'https://x.com/foo/status/1', savedAt: NOW },
        NOW,
      ),
    ).toBe('@foo · 今日');
  });

  it('author の @ が二重にならない', () => {
    expect(
      subtitleOf({ siteName: null, author: '@foo', url: 'https://x.com/a', savedAt: NOW }, NOW),
    ).toBe('@foo · 今日');
  });

  it('author が無ければ siteName を出す', () => {
    expect(
      subtitleOf({ siteName: 'Zenn', author: null, url: 'https://zenn.dev/a', savedAt: NOW }, NOW),
    ).toBe('Zenn · 今日');
  });

  it('どちらも無ければホスト名を出す', () => {
    const savedAt = new Date('2026-08-10T10:00:00');
    expect(
      subtitleOf({ siteName: null, author: null, url: 'https://qiita.com/a', savedAt }, NOW),
    ).toBe('qiita.com · 12日前');
  });
});

describe('relativeDays', () => {
  it.each([
    [0, '今日'],
    [-1, '今日'],
    [1, '1日前'],
    [12, '12日前'],
    [365, '365日前'],
  ])('%i -> %s', (days, expected) => {
    expect(relativeDays(days)).toBe(expected);
  });

  // 煽らない（docs/DesignGuideline.md §7）
  it('感嘆符や絵文字を含まない', () => {
    for (const days of [0, 1, 30, 100]) {
      expect(relativeDays(days)).not.toMatch(/[!！🎉🔥]/u);
    }
  });
});

describe('unreadHeadline', () => {
  it('挨拶ではなく状態を出す（docs/DesignGuideline.md §7）', () => {
    expect(unreadHeadline(23)).toBe('未読 23 件');
    expect(unreadHeadline(0)).toBe('未読 0 件');
  });

  it('挨拶語を含まない', () => {
    expect(unreadHeadline(5)).not.toMatch(/おはよう|こんにちは|Good morning/i);
  });
});
