import { Pressable, View } from 'react-native';

import { Text } from '../Text';
import { useThemeColors } from '../theme';
import { colors, radius } from '../tokens';

export type SegmentProps<T extends string> = {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

/**
 * セグメント（docs/DesignGuideline.md §8）。
 * surface-muted のトラックの上を brand の pill が動く。
 */
export function Segment<T extends string>({ options, value, onChange }: SegmentProps<T>) {
  const theme = useThemeColors();

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: theme['surface-muted'],
        borderRadius: radius.pill,
        padding: 4,
      }}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={{
              flex: 1,
              height: 36,
              borderRadius: radius.pill,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: selected ? colors.brand.brand : 'transparent',
            }}
          >
            <Text variant="caption" style={{ color: selected ? '#FFFFFF' : theme['ink-2'] }}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
