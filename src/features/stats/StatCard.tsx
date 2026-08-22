import { View } from 'react-native';

import { Card, Text } from '@/ui';

/**
 * 今週のサマリー 1 枚。塗りつぶしたカードの上に白抜きで数字を出す。
 *
 * 前週との差分を必ず添える。単独の数字は良し悪しが読めない。
 */
export function StatCard({
  label,
  value,
  delta,
  color,
}: {
  label: string;
  value: string;
  delta: string;
  color: string;
}) {
  return (
    <View style={{ flex: 1 }}>
      {/* 3 枚を横に並べるので、1 枚だけラベルが折り返しても塗りの下端が揃うよう伸ばす。
          塗りは Card の外側にあるので、これで色の付いた面が行の高さいっぱいになる */}
      <Card size="large" backgroundColor={color} style={{ flex: 1 }}>
        <View style={{ padding: 16, gap: 4, minHeight: 96, justifyContent: 'space-between' }}>
          <Text variant="caption" style={{ color: '#FFFFFF', opacity: 0.85 }}>
            {label}
          </Text>
          {/* 数字は Outfit を使う */}
          <Text variant="display" script="latin" style={{ color: '#FFFFFF' }}>
            {value}
          </Text>
          <Text variant="caption" script="latin" style={{ color: '#FFFFFF', opacity: 0.85 }}>
            {delta}
          </Text>
        </View>
      </Card>
    </View>
  );
}
