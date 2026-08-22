import { Pressable, View, type PressableProps } from 'react-native';

import { Text } from '../Text';
import { useThemeColors } from '../theme';
import { colors, layout, radius } from '@/design/tokens';

export type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  variant?: 'primary' | 'secondary';
};

/**
 * 主ボタン（brand 塗り pill）／副ボタン（白 pill）。
 *
 * ラベルは動詞にする（「保存」「開く」「読んだ」）。「OK」「送信」は使わない。
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
          // height ではなく minHeight。英語のラベルは日本語より長く、
          // 固定高だと 2 行になった時点で文字が切れる
          minHeight: layout.buttonHeight,
          borderRadius: radius.pill,
          backgroundColor: isPrimary ? colors.brand.brand : theme.surface,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 24,
          paddingVertical: 12,
        }}
      >
        <Text
          variant="heading"
          numberOfLines={2}
          style={{ color: isPrimary ? '#FFFFFF' : theme.ink, textAlign: 'center' }}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
