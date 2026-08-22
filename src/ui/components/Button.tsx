import { Pressable, View, type PressableProps } from 'react-native';

import { Text } from '../Text';
import { useThemeColors } from '../theme';
import { colors, layout, radius } from '@/design/tokens';

export type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  variant?: 'primary' | 'secondary';
};

/**
 * 主ボタン（brand 塗り pill）／副ボタン（白 pill）（docs/DesignGuideline.md §8）。
 *
 * ラベルは動詞にする（「保存」「開く」「読んだ」）。「OK」「送信」は使わない（§7）。
 */
export function Button({ label, variant = 'primary', disabled, ...rest }: ButtonProps) {
  const theme = useThemeColors();
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled ?? false }}
      disabled={disabled}
      style={({ pressed }) => ({ opacity: pressed || disabled ? 0.6 : 1 })}
      {...rest}
    >
      <View
        style={{
          height: layout.buttonHeight,
          borderRadius: radius.pill,
          backgroundColor: isPrimary ? colors.brand.brand : theme.surface,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 24,
        }}
      >
        <Text variant="heading" style={{ color: isPrimary ? '#FFFFFF' : theme.ink }}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
