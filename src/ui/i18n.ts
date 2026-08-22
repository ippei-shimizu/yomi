import { useMemo } from 'react';

import { storageKeys } from '@/lib/storage';
import { useStoredString } from '@/lib/useStoredValue';

import {
  createTranslate,
  deviceLanguageTags,
  parseLocalePreference,
  resolveLocale,
  type Locale,
  type Translate,
} from '@/lib/i18n';

/**
 * 言語の解決。テーマ（theme.ts）と同じく、設定を読んで描画に使う値にする。
 *
 * 判断そのものは @/lib/i18n の純粋関数にあり、ここは MMKV を購読するだけ。
 * これを @/lib/i18n に置くと、あの barrel を import した層まで
 * react-native を引き込んでテスト不能になる。
 */

/**
 * 現在の言語。設定が system のときだけ端末の言語に追従する。
 *
 * 設定値は MMKV を購読して読むので、設定画面で変えた瞬間に全画面へ伝わる。
 */
export function useLocale(): Locale {
  const [raw] = useStoredString(storageKeys.locale, 'system');
  return resolveLocale(parseLocalePreference(raw), deviceLanguageTags());
}

/** 画面で使う翻訳関数 */
export function useTranslation(): Translate {
  const locale = useLocale();
  return useMemo(() => createTranslate(locale), [locale]);
}
