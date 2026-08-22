import { describe, expect, it } from 'vitest';

import { parseThemePreference, resolveScheme, THEME_PREFERENCES } from './scheme';

describe('parseThemePreference', () => {
  it('保存されている 3 つの値をそのまま返す', () => {
    for (const preference of THEME_PREFERENCES) {
      expect(parseThemePreference(preference)).toBe(preference);
    }
  });

  it('未設定・未知の値は system に倒す（テーマが固定されて戻せなくならない）', () => {
    expect(parseThemePreference(undefined)).toBe('system');
    expect(parseThemePreference(null)).toBe('system');
    expect(parseThemePreference('')).toBe('system');
    expect(parseThemePreference('Dark')).toBe('system');
    expect(parseThemePreference('auto')).toBe('system');
  });
});

describe('resolveScheme', () => {
  it('light / dark は端末設定を無視して固定する', () => {
    expect(resolveScheme('light', 'dark')).toBe('light');
    expect(resolveScheme('dark', 'light')).toBe('dark');
  });

  it('system は端末設定に追従する', () => {
    expect(resolveScheme('system', 'dark')).toBe('dark');
    expect(resolveScheme('system', 'light')).toBe('light');
  });

  it('端末設定が取れないときはライトに倒す', () => {
    expect(resolveScheme('system', null)).toBe('light');
    expect(resolveScheme('system', undefined)).toBe('light');
    expect(resolveScheme('system', 'unspecified')).toBe('light');
  });
});
