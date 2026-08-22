import { useCallback, useSyncExternalStore } from 'react';

import { getBoolean, getString, setBoolean, setString, storage } from '@/lib/storage';

/**
 * MMKV の値を購読するフック。
 *
 * 設定画面と、その設定を使う画面が同じ値を見るために必要。
 * 設定を読む側が複数のレイヤー（ui / features）にまたがるので、
 * 購読の仕組みはどちらにも寄せず lib に置く。
 */

function subscribe(onChange: () => void): () => void {
  const listener = storage.addOnValueChangedListener(onChange);
  return () => listener.remove();
}

export function useStoredBoolean(
  key: string,
  fallback: boolean,
): [boolean, (value: boolean) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => getBoolean(key, fallback),
    () => fallback,
  );
  const set = useCallback((next: boolean) => setBoolean(key, next), [key]);
  return [value, set];
}

export function useStoredString(key: string, fallback: string): [string, (value: string) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => getString(key) ?? fallback,
    () => fallback,
  );
  const set = useCallback((next: string) => setString(key, next), [key]);
  return [value, set];
}
