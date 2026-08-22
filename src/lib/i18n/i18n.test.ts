import { describe, expect, it } from 'vitest';

import { localeFromTag, parseLocalePreference, resolveLocale, LOCALES } from './locale';
import { en } from './messages/en';
import { ja } from './messages/ja';
import { interpolate } from './translate';
import { createTranslate } from './translator';

const PLURAL_SUFFIX = /_(one|other)$/;

function baseKeys(messages: Record<string, string>): Set<string> {
  return new Set(Object.keys(messages).map((key) => key.replace(PLURAL_SUFFIX, '')));
}

describe('メッセージ', () => {
  it('ja と en が同じキーを持つ（未翻訳を残さない）', () => {
    expect([...baseKeys(en)].sort()).toEqual([...baseKeys(ja)].sort());
  });

  it('en に ja へ無い綴りのキーが混ざっていない', () => {
    // 型は index signature を許すため、綴り間違いはここで検出する
    const allowed = new Set(
      Object.keys(ja).flatMap((key) =>
        key.endsWith('_other') ? [key, key.replace(/_other$/, '_one')] : [key],
      ),
    );
    expect(Object.keys(en).filter((key) => !allowed.has(key))).toEqual([]);
  });

  it('空の文言が無い', () => {
    for (const messages of [ja, en] as Record<string, string>[]) {
      for (const [key, value] of Object.entries(messages)) {
        expect(value.trim().length, key).toBeGreaterThan(0);
      }
    }
  });

  it('同じキーの差し込み変数が ja と en で一致する', () => {
    const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

    for (const [key, jaText] of Object.entries(ja) as [string, string][]) {
      const base = key.replace(PLURAL_SUFFIX, '');
      const enText = (en as Record<string, string>)[key] ?? (en as Record<string, string>)[base];
      expect(enText, key).toBeDefined();
      expect(placeholders(enText ?? ''), key).toEqual(placeholders(jaText));
    }
  });
});

describe('interpolate', () => {
  it('プレースホルダを置き換える', () => {
    expect(interpolate('残り {count} 件', { count: 3 })).toBe('残り 3 件');
    expect(interpolate('{a} と {b}', { a: 'x', b: 'y' })).toBe('x と y');
  });

  it('値が無いプレースホルダは残さない', () => {
    expect(interpolate('残り {count} 件', {})).toBe('残り  件');
    expect(interpolate('残り {count} 件', undefined)).toBe('残り  件');
  });
});

describe('createTranslate', () => {
  it('日本語と英語で同じキーから別の文言を返す', () => {
    expect(createTranslate('ja')('common.cancel')).toBe('やめる');
    expect(createTranslate('en')('common.cancel')).toBe('Cancel');
  });

  it('差し込みが効く', () => {
    expect(createTranslate('ja')('tags.deleteConfirm', { name: '技術' })).toBe(
      '「技術」を削除しますか？',
    );
  });

  it('英語は 1 件のときだけ単数形を使う', () => {
    const t = createTranslate('en');
    expect(t('item.daysAgo', { count: 1 })).toBe('1 day ago');
    expect(t('item.daysAgo', { count: 3 })).toBe('3 days ago');
  });

  it('日本語は件数によらず同じ形', () => {
    const t = createTranslate('ja');
    expect(t('item.daysAgo', { count: 1 })).toBe('1日前');
    expect(t('item.daysAgo', { count: 3 })).toBe('3日前');
  });

  it('複数形キーは count なしでも何かを返す', () => {
    expect(createTranslate('ja')('item.daysAgo')).toContain('日前');
  });
});

describe('parseLocalePreference', () => {
  it('既知の値をそのまま返す', () => {
    for (const value of ['system', ...LOCALES]) {
      expect(parseLocalePreference(value)).toBe(value);
    }
  });

  it('未設定・未知の値は system に倒す（読めない言語で固定しない）', () => {
    expect(parseLocalePreference(undefined)).toBe('system');
    expect(parseLocalePreference(null)).toBe('system');
    expect(parseLocalePreference('fr')).toBe('system');
  });
});

describe('localeFromTag', () => {
  it('地域を無視して言語だけを見る', () => {
    expect(localeFromTag('ja-JP')).toBe('ja');
    expect(localeFromTag('en-US')).toBe('en');
    expect(localeFromTag('ja')).toBe('ja');
    expect(localeFromTag('en_GB')).toBe('en');
    expect(localeFromTag('JA-jp')).toBe('ja');
  });

  it('未対応の言語は null', () => {
    expect(localeFromTag('fr-FR')).toBeNull();
    expect(localeFromTag('')).toBeNull();
    expect(localeFromTag(null)).toBeNull();
  });
});

describe('resolveLocale', () => {
  it('明示的な設定は端末の言語より優先する', () => {
    expect(resolveLocale('ja', ['en-US'])).toBe('ja');
    expect(resolveLocale('en', ['ja-JP'])).toBe('en');
  });

  it('system は端末の優先順位で最初に一致した言語を使う', () => {
    expect(resolveLocale('system', ['ja-JP', 'en-US'])).toBe('ja');
    expect(resolveLocale('system', ['fr-FR', 'ja-JP'])).toBe('ja');
  });

  it('対応言語が無ければ英語に倒す（日本語話者以外が読めなくならない）', () => {
    expect(resolveLocale('system', ['fr-FR'])).toBe('en');
    expect(resolveLocale('system', [])).toBe('en');
    expect(resolveLocale('system', [null, undefined])).toBe('en');
  });
});
