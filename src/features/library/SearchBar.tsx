import { Pressable, TextInput, View } from 'react-native';

import { colors, radius, typography } from '@/design/tokens';
import { Text, useThemeColors } from '@/ui';

/** 検索バー（docs/DesignGuideline.md §1: 白 pill、左に虫眼鏡、右に brand のフィルタボタン） */
export function SearchBar({
  value,
  onChangeText,
  filterActive,
  onPressFilter,
}: {
  value: string;
  onChangeText: (value: string) => void;
  filterActive: boolean;
  onPressFilter: () => void;
}) {
  const theme = useThemeColors();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          height: 44,
          paddingHorizontal: 16,
          borderRadius: radius.pill,
          backgroundColor: theme.surface,
        }}
      >
        <Text variant="body" script="latin" style={{ color: theme['ink-3'] }}>
          ⌕
        </Text>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="検索"
          placeholderTextColor={theme['ink-3']}
          returnKeyType="search"
          autoCorrect={false}
          style={{ ...typography.body, flex: 1, color: theme.ink }}
        />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="絞り込み"
        accessibilityState={{ selected: filterActive }}
        onPress={onPressFilter}
        style={{
          width: 44,
          height: 44,
          borderRadius: radius.pill,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: filterActive ? colors.brand.brand : theme.surface,
        }}
      >
        <Text variant="body" script="latin" style={{ color: filterActive ? '#FFFFFF' : theme.ink }}>
          ⚟
        </Text>
      </Pressable>
    </View>
  );
}
