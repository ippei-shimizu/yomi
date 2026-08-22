/**
 * 言語の決定。react-native を import しない純粋モジュール。
 */

export const LOCALES = ['ja', 'en'] as const;

export type Locale = (typeof LOCALES)[number];

/** 端末の言語が未対応だったときに使う言語 */
export const FALLBACK_LOCALE: Locale = 'en';

/** 利用者が選べる言語。system は端末設定に追従する */
export const LOCALE_PREFERENCES = ['system', ...LOCALES] as const;

export type LocalePreference = (typeof LOCALE_PREFERENCES)[number];

/**
 * 保存されている設定値を LocalePreference にする。
 *
 * 未設定・未知の値は system に倒す。壊れた設定で言語が固定されると、
 * 読めない言語のまま設定画面にたどり着けなくなる。
 */
export function parseLocalePreference(raw: string | null | undefined): LocalePreference {
  return LOCALE_PREFERENCES.includes(raw as LocalePreference)
    ? (raw as LocalePreference)
    : 'system';
}

/**
 * BCP 47 のタグ（"ja-JP" / "en-US" / "ja"）から対応言語を選ぶ。
 *
 * 地域まで一致させる必要はないので、先頭のサブタグだけを見る。
 * 対応していない言語は英語に倒す。日本語に倒すと、日本語話者でない
 * 利用者が何も読めなくなる。
 */
export function localeFromTag(tag: string | null | undefined): Locale | null {
  const language = (tag ?? '').split(/[-_]/)[0]?.toLowerCase();
  return LOCALES.includes(language as Locale) ? (language as Locale) : null;
}

/**
 * 設定と端末の言語から、実際に使う言語を決める。
 *
 * 端末の言語は優先度順に複数渡せる。iOS は「日本語 → 英語」のような
 * 優先順位を持つため、先に一致したものを採用する。
 */
export function resolveLocale(
  preference: LocalePreference,
  deviceTags: readonly (string | null | undefined)[],
): Locale {
  if (preference !== 'system') return preference;

  for (const tag of deviceTags) {
    const locale = localeFromTag(tag);
    if (locale !== null) return locale;
  }
  return FALLBACK_LOCALE;
}
