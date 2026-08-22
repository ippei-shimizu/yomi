import { parseThemePreference, type ThemePreference } from '@/design/scheme';
import { DEFAULT_NOTIFICATION_TIME } from '@/domain/notification/schedule';
import { parseLocalePreference, type LocalePreference } from '@/lib/i18n';
import { storageKeys } from '@/lib/storage';
import { useStoredBoolean, useStoredString } from '@/lib/useStoredValue';

/**
 * 端末内の設定。値の読み書きだけを担当し、解釈は各ドメインの純粋関数に任せる。
 */

/** 読了確認シートを出すか（既定 ON） */
export function useReadConfirmSetting() {
  return useStoredBoolean(storageKeys.readConfirm, true);
}

/** 通知時刻。カンマ区切りで複数（Pro のみ複数設定可） */
export function useNotificationTimesSetting() {
  return useStoredString(storageKeys.notificationTimes, DEFAULT_NOTIFICATION_TIME);
}

export function useThemeSetting(): [ThemePreference, (value: ThemePreference) => void] {
  const [raw, set] = useStoredString(storageKeys.theme, 'system');
  return [parseThemePreference(raw), set];
}

export function useLocaleSetting(): [LocalePreference, (value: LocalePreference) => void] {
  const [raw, set] = useStoredString(storageKeys.locale, 'system');
  return [parseLocalePreference(raw), set];
}

export function useOnboardingCompleted() {
  return useStoredBoolean(storageKeys.onboardingCompleted, false);
}
