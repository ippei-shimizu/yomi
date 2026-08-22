import { describe, expect, it } from 'vitest';

import { SOURCES } from '@/domain/url';

import palette from './palette.json';
import {
  SOURCE_COLORS,
  colors,
  fontFamilies,
  staleBadgeColor,
  themeColors,
  typography,
} from './tokens';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const tailwindConfig = require('../../tailwind.config.js');

describe('palette.json と tailwind.config.js', () => {
  it('同じ palette.json を読んでいる（色の二重管理が無い）', () => {
    const twColors = tailwindConfig.theme.extend.colors;

    for (const [name, value] of Object.entries(palette.light)) {
      expect(twColors[name]).toBe(value);
    }
    for (const group of [palette.brand, palette.source, palette.status]) {
      for (const [name, value] of Object.entries(group)) {
        expect(twColors[name]).toBe(value);
      }
    }
    expect(twColors.dark).toEqual(palette.dark);
  });

  it('tokens.ts も同じ値を返す', () => {
    expect(colors.light).toEqual(palette.light);
    expect(colors.dark).toEqual(palette.dark);
  });

  it('themeColors がテーマに応じて切り替わる', () => {
    expect(themeColors('dark')).toEqual(palette.dark);
    expect(themeColors('light')).toEqual(palette.light);
    // 端末設定が取得できない場合・'unspecified' はライトに倒す
    expect(themeColors(null)).toEqual(palette.light);
    expect(themeColors(undefined)).toEqual(palette.light);
    expect(themeColors('unspecified')).toEqual(palette.light);
  });
});

describe('SOURCE_COLORS（docs/DesignGuideline.md §2.3）', () => {
  it('すべてのソースに色が割り当てられている', () => {
    for (const source of SOURCES) {
      expect(SOURCE_COLORS[source]).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });

  it.each([
    ['x', 'src-violet'],
    ['threads', 'src-violet'],
    ['instagram', 'src-coral'],
    ['youtube', 'src-coral'],
    ['zenn', 'src-amber'],
    ['qiita', 'src-amber'],
    ['note', 'src-amber'],
    ['medium', 'src-amber'],
    ['web', 'src-green'],
  ] as const)('%s は %s', (source, token) => {
    expect(SOURCE_COLORS[source]).toBe(palette.source[token]);
  });
});

describe('ステータス色（§2.4: ソースカラーと共有して色数を増やさない）', () => {
  it('warn / danger / ok がソースカラーと同じ値', () => {
    expect(colors.status.warn).toBe(palette.source['src-amber']);
    expect(colors.status.danger).toBe(palette.source['src-coral']);
    expect(colors.status.ok).toBe(palette.source['src-green']);
  });
});

describe('staleBadgeColor（docs/PRD.md §7.2）', () => {
  it.each([0, 1, 7])('%i 日はバッジを出さない', (days) => {
    expect(staleBadgeColor(days)).toBeNull();
  });

  it.each([8, 15, 30])('%i 日は黄（7 日超）', (days) => {
    expect(staleBadgeColor(days)).toBe(colors.status.warn);
  });

  it.each([31, 100])('%i 日は赤（30 日超）', (days) => {
    expect(staleBadgeColor(days)).toBe(colors.status.danger);
  });
});

describe('タイポグラフィ（§4）', () => {
  it('サイズが仕様どおり', () => {
    expect(typography.display.fontSize).toBe(28);
    expect(typography.heading.fontSize).toBe(20);
    expect(typography.body.fontSize).toBe(15);
    expect(typography.caption.fontSize).toBe(13);
  });

  it('和文に 700 超のウェイトを使っていない（§9: 潰れるため）', () => {
    for (const family of Object.values(fontFamilies.ja)) {
      const weight = Number(family.match(/_(\d+)/)?.[1]);
      expect(weight).toBeLessThanOrEqual(700);
    }
  });

  it('英数と和文で同じ variant が揃っている', () => {
    expect(Object.keys(fontFamilies.latin)).toEqual(Object.keys(fontFamilies.ja));
    expect(Object.keys(fontFamilies.latin).sort()).toEqual(Object.keys(typography).sort());
  });
});
