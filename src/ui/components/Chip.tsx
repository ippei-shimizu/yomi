import { Pressable, View } from 'react-native';

import { Text } from '../Text';
import { useThemeColors } from '../theme';
import { colors, radius } from '../tokens';

export type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
};

/** フィルタチップ。選択中は brand 塗りの白文字（docs/DesignGuideline.md §8） */
export function Chip({ label, selected = false, onPress }: ChipProps) {
  const theme = useThemeColors();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      <View
        style={{
          height: 36,
          borderRadius: radius.pill,
          paddingHorizontal: 14,
          justifyContent: 'center',
          backgroundColor: selected ? colors.brand.brand : theme.surface,
        }}
      >
        <Text variant="caption" style={{ color: selected ? '#FFFFFF' : theme.ink }}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
