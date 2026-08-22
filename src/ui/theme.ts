import { colorScheme as nativeWindColorScheme } from 'nativewind';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import {
  parseThemePreference,
  resolveScheme,
  type ColorScheme,
  type ThemePreference,
} from '@/design/scheme';
import { themeColors, type ThemeColors } from '@/design/tokens';
import { storageKeys } from '@/lib/storage';
import { useStoredString } from '@/lib/useStoredValue';

/**
 * 保存されているテーマ設定。MMKV を購読するので、設定画面で変えた瞬間に全画面へ伝わる。
 */
function useThemePreference(): ThemePreference {
  const [raw] = useStoredString(storageKeys.theme, 'system');
  return parseThemePreference(raw);
}

/** 実際に使う配色。設定が system のときだけ端末設定に追従する */
export function useColorSchemeSetting(): ColorScheme {
  return resolveScheme(useThemePreference(), useColorScheme());
}

/** 現在の配色 */
export function useThemeColors(): ThemeColors {
  return themeColors(useColorSchemeSetting());
}

export function useIsDark(): boolean {
  return useColorSchemeSetting() === 'dark';
}

/**
 * NativeWind の `dark:` クラスを同じ設定に従わせる。アプリの最上位で一度だけ呼ぶ。
 *
 * NativeWind は既定で端末設定を見るため、これが無いと className で書いた箇所だけ
 * テーマ設定を無視する。解決後の配色ではなく設定値をそのまま渡すことで、
 * system のときは NativeWind 側も端末設定への追従を続ける。
 */
export function useApplyColorScheme(): void {
  const preference = useThemePreference();

  useEffect(() => {
    nativeWindColorScheme.set(preference);
  }, [preference]);
}
