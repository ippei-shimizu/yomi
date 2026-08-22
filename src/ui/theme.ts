import { useColorScheme } from 'react-native';

import { themeColors, type ThemeColors } from './tokens';

/** 現在の配色。ダークモードは端末設定に追従する（docs/DesignGuideline.md §2.5） */
export function useThemeColors(): ThemeColors {
  return themeColors(useColorScheme());
}

export function useIsDark(): boolean {
  return useColorScheme() === 'dark';
}
