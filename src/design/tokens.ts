import type { Source } from '@/domain/url';

import palette from './palette.json';

/**
 * デザイントークン（docs/DesignGuideline.md）。
 *
 * 色は palette.json が唯一の情報源で、tailwind.config.js も同じファイルを読む。
 * className を使えない箇所（react-native-svg、Skia、ナビゲーションの設定など）は
 * ここから取る。**コンポーネント内に色をハードコードしない**（R-UI1）。
 *
 * このファイルは値だけを持ち、react-native を import しない。Node から
 * テストでき、Share Extension からも安全に読めるようにするため
 * （src/ui/ 配下だと Extension の依存ルールで弾かれる。docs/DesignDoc.md §3.1）。
 * 端末のテーマに追従する取得は src/ui/theme.ts の useThemeColors() を使う。
 */

export type ThemeColors = typeof palette.light;

export const colors = {
  light: palette.light,
  dark: palette.dark,
  /** ブランド・ソース・ステータス色はライト / ダークで変えない（§2.5） */
  brand: palette.brand,
  source: palette.source,
  status: palette.status,
} as const;

/**
 * 端末のテーマ名から配色を選ぶ。フックは theme.ts を参照。
 *
 * React Native の ColorSchemeName は 'unspecified' も取りうるため、
 * 'dark' 以外はすべてライトに倒す。
 */
export function themeColors(scheme: string | null | undefined): ThemeColors {
  return scheme === 'dark' ? colors.dark : colors.light;
}

/** 保存元 → カード / アイコンの色（§2.3） */
export const SOURCE_COLORS: Record<Source, string> = {
  x: palette.source['src-violet'],
  threads: palette.source['src-violet'],
  instagram: palette.source['src-coral'],
  youtube: palette.source['src-coral'],
  zenn: palette.source['src-amber'],
  qiita: palette.source['src-amber'],
  note: palette.source['src-amber'],
  medium: palette.source['src-amber'],
  web: palette.source['src-green'],
};

/** 角丸（§3） */
export const radius = {
  icon: 10,
  thumb: 12,
  card: 20,
  cardLg: 28,
  sheet: 28,
  pill: 999,
} as const;

/** レイアウト（§5） */
export const layout = {
  screenPadding: 20,
  cardGap: 12,
  sectionGap: 28,
  rowHeight: 76,
  thumbSize: 56,
  sourceIconSize: 32,
  /** タブバーがコンテンツを隠すため、各リストの下端に空ける余白 */
  listBottomInset: 100,
  tabBar: {
    height: 64,
    bottomOffset: 24,
    /** 画面幅から引く値。幅 = screenWidth - horizontalInset */
    horizontalInset: 40,
    indicatorSize: 4,
  },
  buttonHeight: 52,
  badgeHeight: 20,
  /** Today's Pick の切り欠き半径（§6） */
  notchRadius: 18,
  notchButtonSize: 44,
} as const;

/**
 * 影（§3）。**白カードにのみ付ける。色カードには付けない**（浮きすぎるため）。
 * iOS のみ対象なので elevation は持たない。
 */
export const cardShadow = {
  shadowColor: palette.light.ink,
  shadowOpacity: 0.06,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 6 },
} as const;

/**
 * タイポグラフィ（§4）。
 *
 * React Native は 1 つの fontFamily しか指定できず、CSS のような
 * 複数フォントのフォールバックができない。そのため和文用と英数用で
 * family を分け、呼び出し側が用途で選ぶ（src/ui/Text.tsx を参照）。
 */
export const typography = {
  display: { fontSize: 28, lineHeight: 28 * 1.3, letterSpacing: -0.3 },
  heading: { fontSize: 20, lineHeight: 20 * 1.3 },
  body: { fontSize: 15, lineHeight: 15 * 1.5 },
  caption: { fontSize: 13, lineHeight: 13 * 1.5 },
} as const;

export type TextVariant = keyof typeof typography;

/**
 * 英数用（Outfit）と和文用（Zen Kaku Gothic New）の family 名。
 *
 * Zen Kaku には SemiBold(600) が無いため heading は Medium(500) を当てる。
 * §9 の「和文にウェイト 700 超を使わない」に沿い、和文の最大は Bold(700)。
 */
export const fontFamilies = {
  latin: {
    display: 'Outfit_700Bold',
    heading: 'Outfit_600SemiBold',
    body: 'Outfit_500Medium',
    caption: 'Outfit_400Regular',
  },
  ja: {
    display: 'ZenKakuGothicNew_700Bold',
    heading: 'ZenKakuGothicNew_500Medium',
    body: 'ZenKakuGothicNew_500Medium',
    caption: 'ZenKakuGothicNew_400Regular',
  },
} as const satisfies Record<'latin' | 'ja', Record<TextVariant, string>>;

/** 放置日数バッジのしきい値（docs/PRD.md §7.2） */
export const STALE_BADGE_THRESHOLDS = { warn: 7, danger: 30 } as const;

/** 放置日数に対応するバッジ色。しきい値未満なら null（バッジを出さない） */
export function staleBadgeColor(days: number): string | null {
  if (days > STALE_BADGE_THRESHOLDS.danger) return colors.status.danger;
  if (days > STALE_BADGE_THRESHOLDS.warn) return colors.status.warn;
  return null;
}
