import { useCallback, useSyncExternalStore } from 'react';

import { DEFAULT_NOTIFICATION_TIME } from '@/domain/notification/schedule';
import { getBoolean, getString, setBoolean, setString, storage, storageKeys } from '@/lib/storage';

/**
 * 端末内の設定（docs/Screens.md S11）。
 *
 * MMKV の変更を購読して、設定画面と他の画面が同じ値を見るようにする。
 */
export type ThemePreference = 'system' | 'light' | 'dark';

const THEME_VALUES: readonly ThemePreference[] = ['system', 'light', 'dark'];

function subscribe(onChange: () => void): () => void {
  const listener = storage.addOnValueChangedListener(onChange);
  return () => listener.remove();
}

function useStoredBoolean(key: string, fallback: boolean): [boolean, (value: boolean) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => getBoolean(key, fallback),
    () => fallback,
  );
  const set = useCallback((next: boolean) => setBoolean(key, next), [key]);
  return [value, set];
}

function useStoredString(key: string, fallback: string): [string, (value: string) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => getString(key) ?? fallback,
    () => fallback,
  );
  const set = useCallback((next: string) => setString(key, next), [key]);
  return [value, set];
}

/** 読了確認シートを出すか（既定 ON。docs/Screens.md §6） */
export function useReadConfirmSetting() {
  return useStoredBoolean(storageKeys.readConfirm, true);
}

/** 通知時刻。カンマ区切りで複数（Pro のみ複数設定可） */
export function useNotificationTimesSetting() {
  return useStoredString(storageKeys.notificationTimes, DEFAULT_NOTIFICATION_TIME);
}

export function useThemeSetting(): [ThemePreference, (value: ThemePreference) => void] {
  const [raw, set] = useStoredString(storageKeys.theme, 'system');
  const value = (THEME_VALUES as readonly string[]).includes(raw)
    ? (raw as ThemePreference)
    : 'system';
  return [value, set];
}

export function useOnboardingCompleted() {
  return useStoredBoolean(storageKeys.onboardingCompleted, false);
}
