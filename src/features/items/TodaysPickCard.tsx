import { Pressable, useWindowDimensions, View } from 'react-native';

import type { Item } from '@/db/schema';
import { layout, radius, SOURCE_COLORS } from '@/design/tokens';
import { SourceIcon, Text } from '@/ui';

import { displayTitle, subtitleOf } from './display';
import { NotchedCard } from './NotchedCard';

const CARD_HEIGHT = 160;

/**
 * Today's Pick（docs/DesignGuideline.md §6）。
 *
 * 塗りはそのアイテムのソースカラーなので毎日色が変わる。
 * **切り欠きは Yomi 内でこのカードにだけ使う。**
 */
export function TodaysPickCard({
  item,
  now = new Date(),
  canReshuffle,
  onReshuffle,
  onOpen,
}: {
  item: Item;
  now?: Date;
  canReshuffle: boolean;
  onReshuffle: () => void;
  onOpen: () => void;
}) {
  const { width } = useWindowDimensions();
  const cardWidth = width - layout.screenPadding * 2;
  const notchCenterY = CARD_HEIGHT / 2;

  return (
    <View>
      <NotchedCard
        width={cardWidth}
        height={CARD_HEIGHT}
        backgroundColor={SOURCE_COLORS[item.source]}
        notchCenterY={notchCenterY}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`今日の 1 本: ${displayTitle(item)}`}
          onPress={onOpen}
          style={{ flex: 1, padding: 20, paddingRight: layout.notchRadius + 28, gap: 8 }}
        >
          <View
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <Text variant="caption" script="latin" style={{ color: '#FFFFFF', opacity: 0.8 }}>
              TODAY&apos;S PICK
            </Text>
            {canReshuffle ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="引き直す"
                onPress={onReshuffle}
                hitSlop={12}
              >
                <Text variant="heading" script="latin" style={{ color: '#FFFFFF' }}>
                  ⟳
                </Text>
              </Pressable>
            ) : null}
          </View>

          <View style={{ flex: 1, justifyContent: 'flex-end', gap: 6 }}>
            <Text variant="heading" numberOfLines={2} style={{ color: '#FFFFFF' }}>
              {displayTitle(item)}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <SourceIcon source={item.source} size={16} />
              <Text variant="caption" style={{ color: '#FFFFFF', opacity: 0.85 }} numberOfLines={1}>
                {subtitleOf(item, now)}
              </Text>
            </View>
          </View>
        </Pressable>
      </NotchedCard>

      {/* 切り欠きの内側に置く白い丸ボタン。ここをタップで Browser（§6） */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="開く"
        onPress={onOpen}
        style={{
          position: 'absolute',
          right: -layout.notchButtonSize / 2 + layout.notchRadius,
          top: notchCenterY - layout.notchButtonSize / 2,
          width: layout.notchButtonSize,
          height: layout.notchButtonSize,
          borderRadius: radius.pill,
          backgroundColor: '#FFFFFF',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text variant="heading" script="latin" style={{ color: SOURCE_COLORS[item.source] }}>
          →
        </Text>
      </Pressable>
    </View>
  );
}
