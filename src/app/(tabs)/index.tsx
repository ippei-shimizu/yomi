import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';

import type { Item } from '@/db/schema';
import { layout } from '@/design/tokens';
import { displayTitle } from '@/features/items/display';
import { ItemRow } from '@/features/items/ItemRow';
import { SwipeableRow } from '@/features/items/SwipeableRow';
import { TodaysPickCard } from '@/features/items/TodaysPickCard';
import type { UnreadOrder } from '@/features/items/queries';
import { useItemActions, useStaleItems, useUnreadItems } from '@/features/items/queries';
import { useTodaysPick } from '@/features/items/useTodaysPick';
import { SNOOZE_DAYS } from '@/features/reading/snooze';
import { HomeBanner } from '@/features/home/HomeBanner';
import { HomeHeader } from '@/features/home/HomeHeader';
import { useDatabase } from '@/db/DatabaseProvider';
import { remainingSaves, shouldWarnAboutLimit, useEntitlement } from '@/domain/entitlement';
import { getString, setString, storageKeys } from '@/lib/storage';
import { Button, EmptyState, colors, useThemeColors } from '@/ui';

export default function HomeScreen() {
  const theme = useThemeColors();
  const { width } = useWindowDimensions();
  const [order, setOrder] = useState<UnreadOrder>(
    () => (getString(storageKeys.unreadOrder) as UnreadOrder | undefined) ?? 'oldest',
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

  // 早めに絞り込んでおくと、下の JSX で item の null 判定を繰り返さずに済む
  const pickItem = pick.item;

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
            <HomeHeader
              count={items.length}
              order={order}
              onToggleOrder={toggleOrder}
              onSearch={() => router.push('/(tabs)/library')}
            />

            {pickItem === null ? null : (
              <TodaysPickCard
                item={pickItem}
                canReshuffle={pick.canReshuffle}
                onReshuffle={pick.reshuffle}
                onOpen={() => openItem(pickItem)}
              />
            )}

            {shouldWarnAboutLimit(remaining) ? (
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  router.push({ pathname: '/paywall', params: { trigger: 'limit_save' } })
                }
              >
                <HomeBanner
                  dotColor={colors.status.warn}
                  label={`保存できるのは残り ${remaining} 件です`}
                />
              </Pressable>
            ) : null}

            {staleCount > 0 ? (
              <Pressable accessibilityRole="button" onPress={() => router.push('/stale')}>
                <HomeBanner
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
