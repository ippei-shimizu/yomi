/**
 * テーマ設定の解決。
 *
 * tokens.ts と同じく値だけを持ち、react-native を import しない。
 * 端末の配色を読むのはフック（src/ui/theme.ts）の役目で、
 * 「設定 + 端末の配色 → 実際に使う配色」の判断だけをここに置く。
 */

/** 利用者が選べるテーマ。system は端末設定に追従する */
export type ThemePreference = 'system' | 'light' | 'dark';

export const THEME_PREFERENCES: readonly ThemePreference[] = ['system', 'light', 'dark'];

/** 実際に描画に使う配色。'unspecified' のような中間状態は持たない */
export type ColorScheme = 'light' | 'dark';

/**
 * 保存されている設定値を ThemePreference にする。
 *
 * 未設定・未知の値はすべて system に倒す。壊れた設定でテーマが固定されると、
 * 端末をダークにしても戻らない状態になり、利用者からは直しようがない。
 */
export function parseThemePreference(raw: string | null | undefined): ThemePreference {
  return THEME_PREFERENCES.includes(raw as ThemePreference) ? (raw as ThemePreference) : 'system';
}

/**
 * 設定と端末の配色から、実際に使う配色を決める。
 *
 * React Native の ColorSchemeName は null や 'unspecified' も取りうるため、
 * system のときは 'dark' 以外をすべてライトに倒す。
 */
export function resolveScheme(
  preference: ThemePreference,
  systemScheme: string | null | undefined,
): ColorScheme {
  if (preference === 'light') return 'light';
  if (preference === 'dark') return 'dark';
  return systemScheme === 'dark' ? 'dark' : 'light';
}
