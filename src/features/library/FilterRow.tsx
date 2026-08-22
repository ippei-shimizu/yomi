import { ScrollView, View } from 'react-native';

import { Chip, Text, useThemeColors } from '@/ui';

export type FilterChip = {
  key: string;
  label: string;
  selected: boolean;
  onPress: () => void;
};

/**
 * 絞り込みシートの 1 行。見出し + 横スクロールする Chip 列。
 *
 * タグは数が読めないので、折り返さず横スクロールにして高さを一定に保つ。
 */
export function FilterRow({ label, chips }: { label: string; chips: FilterChip[] }) {
  const theme = useThemeColors();

  return (
    <View style={{ gap: 6 }}>
      <Text variant="caption" style={{ color: theme['ink-2'] }}>
        {label}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {chips.map((chip) => (
          <Chip key={chip.key} label={chip.label} selected={chip.selected} onPress={chip.onPress} />
        ))}
      </ScrollView>
    </View>
  );
}
