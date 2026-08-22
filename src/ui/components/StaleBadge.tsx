import { View } from 'react-native';

import { Text } from '../Text';
import { layout, radius, staleBadgeColor } from '@/design/tokens';

/**
 * 放置日数バッジ（docs/PRD.md §7.2）。7 日超で黄、30 日超で赤。
 * しきい値未満では何も描画しない。
 *
 * 高さ 20 の小さな pill にして、カードと混同しないようにする（§2.4）。
 */
export function StaleBadge({ days }: { days: number }) {
  const color = staleBadgeColor(days);
  if (color === null) return null;

  return (
    <View
      style={{
        height: layout.badgeHeight,
        borderRadius: radius.pill,
        backgroundColor: color,
        paddingHorizontal: 8,
        justifyContent: 'center',
      }}
    >
      {/* 数字なので Outfit（§4） */}
      <Text variant="caption" script="latin" style={{ color: '#FFFFFF', lineHeight: 13 }}>
        {days}d
      </Text>
    </View>
  );
}
