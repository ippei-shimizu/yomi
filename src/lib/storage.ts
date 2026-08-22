import { createMMKV } from 'react-native-mmkv';

/**
 * 端末内の設定値。
 * アイテムのデータは SQLite に持ち、ここには設定と一時的な状態だけを置く。
 */
const storage = createMMKV({ id: 'yomi' });

export const storageKeys = {
  onboardingCompleted: 'onboarding:completed',
  readConfirm: 'settings:readConfirm',
  notificationTimes: 'settings:notificationTimes',
  theme: 'settings:theme',
  locale: 'settings:locale',
  unreadOrder: 'home:unreadOrder',
  /** Today's Pick の引き直し回数。日付が変わればリセットする */
  pickNonce: (dateKey: string) => `pick:${dateKey}`,
} as const;

export function getBoolean(key: string, fallback: boolean): boolean {
  return storage.getBoolean(key) ?? fallback;
}

export function setBoolean(key: string, value: boolean): void {
  storage.set(key, value);
}

export function getNumber(key: string, fallback: number): number {
  return storage.getNumber(key) ?? fallback;
}

export function setNumber(key: string, value: number): void {
  storage.set(key, value);
}

export function getString(key: string): string | undefined {
  return storage.getString(key);
}

export function setString(key: string, value: string): void {
  storage.set(key, value);
}

export function remove(key: string): void {
  storage.remove(key);
}

/** 日付が変わった古い pick:* キーを掃除する */
export function clearStalePickNonces(currentDateKey: string): void {
  for (const key of storage.getAllKeys()) {
    if (key.startsWith('pick:') && key !== storageKeys.pickNonce(currentDateKey)) {
      storage.remove(key);
    }
  }
}

export { storage };
