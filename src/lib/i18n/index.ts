/**
 * i18n の純粋な部分だけを公開する。
 *
 * フックは `@/lib/i18n/useTranslation` から直接 import する。ここに混ぜると
 * MMKV 経由で react-native を引き込み、この barrel を import した層まで
 * まるごと Node からテストできなくなる。
 */
export { deviceLanguageTags } from './deviceLocale';
export {
  FALLBACK_LOCALE,
  LOCALES,
  LOCALE_PREFERENCES,
  localeFromTag,
  parseLocalePreference,
  resolveLocale,
  type Locale,
  type LocalePreference,
} from './locale';
export { interpolate, pluralKey, type TranslateParams } from './translate';
export { createTranslate, type Translate } from './translator';
export type { MessageKey, Messages } from './types';
