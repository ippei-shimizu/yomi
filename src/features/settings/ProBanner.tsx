import { Pressable, View } from 'react-native';

import { colors } from '@/design/tokens';
import { Card, Text } from '@/ui';

/**
 * 設定画面の先頭に出す Pro の案内。無料プランの時だけ描く。
 *
 * 何ができるようになるかだけを書く。残り日数や煽り文句は置かない。
 */
export function ProBanner({ onPress }: { onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      <Card size="large" backgroundColor={colors.brand.brand}>
        <View style={{ padding: 20, gap: 4 }}>
          <Text variant="heading" style={{ color: '#FFFFFF' }}>
            ★ Yomi Pro
          </Text>
          <Text variant="caption" style={{ color: '#FFFFFF', opacity: 0.85 }}>
            上限解除・メモ検索・一括整理
          </Text>
        </View>
      </Card>
    </Pressable>
  );
}
