import { Pressable, View } from 'react-native';

import { colors, radius } from '@/design/tokens';
import { Text, useThemeColors } from '@/ui';

/**
 * 料金プラン 1 行。選択中は枠と塗りで示す。
 *
 * 価格は RevenueCat から取れた実売価格を優先し、取れない間だけ
 * 呼び出し側のフォールバックを出す。
 */
export function PlanOption({
  label,
  price,
  badge,
  selected,
  onPress,
}: {
  label: string;
  price: string;
  badge?: string | undefined;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useThemeColors();

  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ selected }} onPress={onPress}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          padding: 16,
          borderRadius: radius.card,
          borderWidth: 2,
          borderColor: selected ? colors.brand.brand : 'transparent',
          backgroundColor: selected ? colors.brand['brand-soft'] : theme.surface,
        }}
      >
        <Text variant="body" style={{ flex: 1, color: theme.ink }}>
          {label}
        </Text>
        {badge === undefined ? null : (
          <View
            style={{
              backgroundColor: colors.source['src-amber'],
              borderRadius: radius.pill,
              paddingHorizontal: 10,
              height: 20,
              justifyContent: 'center',
            }}
          >
            <Text variant="caption" style={{ color: '#FFFFFF', lineHeight: 13 }}>
              {badge}
            </Text>
          </View>
        )}
        <Text variant="body" script="latin" style={{ color: theme.ink }}>
          {price}
        </Text>
      </View>
    </Pressable>
  );
}
