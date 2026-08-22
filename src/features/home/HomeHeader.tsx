import { Pressable, View } from 'react-native';

import type { UnreadOrder } from '@/features/items/queries';
import { unreadHeadline } from '@/features/items/display';
import { Text, useThemeColors } from '@/ui';

/**
 * ホームのヘッダー。ナビバーは使わず、コンテンツ先頭に直接置く。
 *
 * 挨拶ではなく状態を主語にする（「未読 23 件」）。
 */
export function HomeHeader({
  count,
  order,
  onToggleOrder,
  onSearch,
}: {
  count: number;
  order: UnreadOrder;
  onToggleOrder: () => void;
  onSearch: () => void;
}) {
  const theme = useThemeColors();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
      <View>
        <Text variant="caption" style={{ color: theme['ink-2'] }}>
          今日も 1 本
        </Text>
        <Text variant="display" style={{ color: theme.ink }}>
          {unreadHeadline(count)}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={order === 'oldest' ? '新しい順に並べ替える' : '古い順に並べ替える'}
          onPress={onToggleOrder}
          hitSlop={8}
        >
          <Text variant="heading" script="latin" style={{ color: theme.ink }}>
            ⇅
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="検索"
          onPress={onSearch}
          hitSlop={8}
        >
          <Text variant="heading" script="latin" style={{ color: theme.ink }}>
            ⌕
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
