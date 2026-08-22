import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';

import type { Item } from '@/db/schema';
import { itemRepo } from '@/db/repositories';
import { layout, radius } from '@/design/tokens';
import { displayTitle, unreadHeadline } from '@/features/items/display';
import { ItemRow } from '@/features/items/ItemRow';
import { SwipeableRow } from '@/features/items/SwipeableRow';
import { TodaysPickCard } from '@/features/items/TodaysPickCard';
import { useItemActions, useStaleItems, useUnreadItems } from '@/features/items/queries';
import { useTodaysPick } from '@/features/items/useTodaysPick';
import { useDatabase } from '@/db/DatabaseProvider';
import { remainingSaves, shouldWarnAboutLimit, useEntitlement } from '@/domain/entitlement';
import { getString, setString, storageKeys } from '@/lib/storage';
import { Button, EmptyState, Text, colors, useThemeColors } from '@/ui';

/** スヌーズの既定日数 */
const SNOOZE_DAYS = 7;

export default function HomeScreen() {
  const theme = useThemeColors();
  const { width } = useWindowDimensions();
  const [order, setOrder] = useState<itemRepo.UnreadOrder>(
    () => (getString(storageKeys.unreadOrder) as itemRepo.UnreadOrder | undefined) ?? 'oldest',
  );

  const db = useDatabase();
  const { isPro } = useEntitlement();
  const remaining = remainingSaves(db, isPro);

  const unread = useUnreadItems(order);
  const pick = useTodaysPick();
  const actions = useItemActions();

  const items = unread.data ?? [];
  const staleCount = useStaleItems().data?.length ?? 0;

  const toggleOrder = useCallback(() => {
    setOrder((current) => {
      const next = current === 'oldest' ? 'newest' : 'oldest';
      setString(storageKeys.unreadOrder, next);
      return next;
    });
  }, []);

  const openItem = useCallback((item: Item) => {
    router.push({ pathname: '/item/[id]', params: { id: item.id, open: '1' } });
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: Item }) => (
      <View style={{ marginBottom: layout.cardGap }}>
        <SwipeableRow
          width={width - layout.screenPadding * 2}
          onSwipeRight={() => actions.mutate({ type: 'read', id: item.id })}
          onSwipeLeft={() => actions.mutate({ type: 'archive', id: item.id })}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={displayTitle(item)}
            onPress={() => openItem(item)}
            onLongPress={() => actions.mutate({ type: 'snooze', id: item.id, days: SNOOZE_DAYS })}
          >
            <ItemRow item={item} />
          </Pressable>
        </SwipeableRow>
      </View>
    ),
    [actions, openItem, width],
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <FlashList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: layout.screenPadding,
          paddingTop: 24,
          // 浮いたタブバーに隠れないよう下端を空ける
          paddingBottom: layout.listBottomInset,
        }}
        ListHeaderComponent={
          <View style={{ gap: layout.sectionGap, marginBottom: layout.sectionGap }}>
            <Header
              count={items.length}
              order={order}
              onToggleOrder={toggleOrder}
              onSearch={() => router.push('/(tabs)/library')}
            />

            {pick.item === null ? null : (
              <TodaysPickView
                item={pick.item}
                canReshuffle={pick.canReshuffle}
                onReshuffle={pick.reshuffle}
                onOpen={openItem}
              />
            )}

            {shouldWarnAboutLimit(remaining) ? (
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  router.push({ pathname: '/paywall', params: { trigger: 'limit_save' } })
                }
              >
                {/* 事実だけを書く。煽らない */}
                <Banner
                  dotColor={colors.status.warn}
                  label={`保存できるのは残り ${remaining} 件です`}
                />
              </Pressable>
            ) : null}

            {staleCount > 0 ? (
              <Pressable accessibilityRole="button" onPress={() => router.push('/stale')}>
                <Banner
                  dotColor={colors.status.danger}
                  label={`30日以上放置が ${staleCount} 件 → 整理する`}
                />
              </Pressable>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          unread.isLoading ? null : (
            <EmptyState
              title="未読はありません"
              description="X や Safari で見つけたら、共有シートから Yomi に送ってください"
              action={
                <Button
                  label="共有シートの設定方法"
                  variant="secondary"
                  onPress={() => router.push('/onboarding/share')}
                />
              }
            />
          )
        }
      />
    </View>
  );
}

/** ホーム上部の通知バナー。brand-soft 塗りの pill */
function Banner({ dotColor, label }: { dotColor: string; label: string }) {
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

function TodaysPickView({
  item,
  canReshuffle,
  onReshuffle,
  onOpen,
}: {
  item: Item;
  canReshuffle: boolean;
  onReshuffle: () => void;
  onOpen: (item: Item) => void;
}) {
  return (
    <TodaysPickCard
      item={item}
      canReshuffle={canReshuffle}
      onReshuffle={onReshuffle}
      onOpen={() => onOpen(item)}
    />
  );
}

function Header({
  count,
  order,
  onToggleOrder,
  onSearch,
}: {
  count: number;
  order: itemRepo.UnreadOrder;
  onToggleOrder: () => void;
  onSearch: () => void;
}) {
  const theme = useThemeColors();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
      <View>
        {/* 挨拶ではなく状態を主語にする */}
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
