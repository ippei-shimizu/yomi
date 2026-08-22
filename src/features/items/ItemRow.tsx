import { Image, View } from 'react-native';

import type { Item } from '@/db/schema';
import { daysBetween } from '@/domain/date/week';
import { layout, radius } from '@/design/tokens';
import { SourceIcon, StaleBadge, Text, useThemeColors } from '@/ui';

import { displayTitle, subtitleOf } from './display';

/**
 * リスト 1 行。
 * 行高 76、サムネ 56、左にソースアイコン、右に放置バッジ。
 */
export function ItemRow({ item, now = new Date() }: { item: Item; now?: Date }) {
  const theme = useThemeColors();
  const isSnoozed = item.snoozedUntil !== null && item.snoozedUntil > now;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        height: layout.rowHeight,
        paddingHorizontal: 12,
        borderRadius: radius.card,
        backgroundColor: theme.surface,
        // スヌーズ中は末尾に薄く表示する
        opacity: isSnoozed ? 0.5 : 1,
      }}
    >
      {item.thumbnailUrl === null ? (
        <SourceIcon source={item.source} size={layout.thumbSize} />
      ) : (
        <Image
          source={{ uri: item.thumbnailUrl }}
          style={{
            width: layout.thumbSize,
            height: layout.thumbSize,
            borderRadius: radius.thumb,
            backgroundColor: theme['surface-muted'],
          }}
        />
      )}

      <View style={{ flex: 1, gap: 4 }}>
        <Text variant="body" numberOfLines={2} style={{ color: theme.ink }}>
          {displayTitle(item)}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <SourceIcon source={item.source} size={16} />
          <Text variant="caption" style={{ color: theme['ink-2'] }} numberOfLines={1}>
            {subtitleOf(item, now)}
          </Text>
        </View>
      </View>

      <StaleBadge days={daysBetween(item.savedAt, now)} />
    </View>
  );
}
