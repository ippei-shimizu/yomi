import { describe, expect, it } from 'vitest';

import { createTranslate } from '@/lib/i18n';

import { MAX_TAG_LENGTH, normalizeTagName, tagNameErrorMessage, validateTagName } from './tagName';

const t = createTranslate('ja');

describe('normalizeTagName', () => {
  it('前後の空白を落とす', () => {
    expect(normalizeTagName('  rails  ')).toBe('rails');
  });

  it('連続空白を 1 つにする', () => {
    expect(normalizeTagName('ruby   on   rails')).toBe('ruby on rails');
  });

  it('大文字小文字は保持する', () => {
    expect(normalizeTagName('Rails')).toBe('Rails');
  });
});

describe('validateTagName', () => {
  it('通常のタグ名を受け付ける', () => {
    expect(validateTagName('rails', [])).toEqual({ ok: true, name: 'rails' });
  });

  it.each(['', '   ', '\n\t'])('%o は empty', (input) => {
    expect(validateTagName(input, [])).toEqual({ ok: false, error: 'empty' });
  });

  it('長すぎる名前を拒否する', () => {
    expect(validateTagName('あ'.repeat(MAX_TAG_LENGTH + 1), [])).toEqual({
      ok: false,
      error: 'too-long',
    });
  });

  it('上限ちょうどは通す', () => {
    expect(validateTagName('あ'.repeat(MAX_TAG_LENGTH), []).ok).toBe(true);
  });

  it('重複を拒否する', () => {
    expect(validateTagName('rails', ['db', 'rails'])).toEqual({ ok: false, error: 'duplicate' });
  });

  // 「Rails」と「rails」が並ぶと、どちらに付けたか分からなくなる
  it('大文字小文字が違うだけの名前も重複とみなす', () => {
    expect(validateTagName('Rails', ['rails']).ok).toBe(false);
    expect(validateTagName('RAILS', ['rails']).ok).toBe(false);
  });

  it('空白を整えたあとで重複判定する', () => {
    expect(validateTagName('  rails  ', ['rails']).ok).toBe(false);
  });
});

describe('tagNameErrorMessage', () => {
  it.each(['empty', 'too-long', 'duplicate'] as const)('%s に文言がある', (error) => {
    expect(tagNameErrorMessage(t, error).length).toBeGreaterThan(0);
  });

  // 煽らない
  it('感嘆符を含まない', () => {
    for (const error of ['empty', 'too-long', 'duplicate'] as const) {
      expect(tagNameErrorMessage(t, error)).not.toMatch(/[!！]/);
    }
  });
});
