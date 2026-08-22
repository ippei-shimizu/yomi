import { View } from 'react-native';

import { colors, radius } from '@/design/tokens';
import { Text } from '@/ui';

/**
 * ホーム上部の通知バナー。brand-soft 塗りの pill に、左へ状況を示す色ドット。
 *
 * 放置アイテムの案内と保存上限の警告で共用する。文言は事実だけを書き、
 * 煽らない。
 */
export function HomeBanner({ dotColor, label }: { dotColor: string; label: string }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: colors.brand['brand-soft'],
        borderRadius: radius.pill,
        paddingHorizontal: 16,
        paddingVertical: 12,
      }}
    >
      <View style={{ width: 8, height: 8, borderRadius: radius.pill, backgroundColor: dotColor }} />
      <Text variant="caption" style={{ color: colors.brand.brand }}>
        {label}
      </Text>
    </View>
  );
}
