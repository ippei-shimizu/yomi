import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Item } from '@/db/schema';
import { layout } from '@/design/tokens';
import { useEntitlement } from '@/domain/entitlement';
import { useItemActions, useStaleItems } from '@/features/items/queries';
import { StaleActionBar } from '@/features/stale/StaleActionBar';
import { StaleRow } from '@/features/stale/StaleRow';
import { EmptyState, ScreenHeader, Text, useThemeColors } from '@/ui';

/**
 * 放置アイテムの一括整理。
 * 30 日超の未読を「読むか捨てるか」判断させる。
 */
export default function StaleItemsScreen() {
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const { limits } = useEntitlement();

  const { data: items = [], isLoading } = useStaleItems();
  const actions = useItemActions();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = () => {
    setSelected((current) =>
      current.size === items.length ? new Set() : new Set(items.map((item) => item.id)),
    );
  };

  /** 一括操作は Pro。無料は一覧の閲覧まで */
  const runBulk = (action: 'archive' | 'bump') => {
    if (!limits.staleBulkAction) {
      router.push({ pathname: '/paywall', params: { trigger: 'stale_bulk' } });
      return;
    }

    const ids = [...selected];
    actions.mutate(
      action === 'archive' ? { type: 'archiveMany', ids } : { type: 'bumpToNow', ids },
      { onSuccess: () => setSelected(new Set()) },
    );
  };

  const renderItem = useCallback(
    ({ item }: { item: Item }) => (
      <StaleRow item={item} selected={selected.has(item.id)} onToggle={() => toggle(item.id)} />
    ),
    [selected, toggle],
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View
        style={{
          paddingHorizontal: layout.screenPadding,
          paddingTop: insets.top + 8,
          paddingBottom: layout.cardGap,
        }}
      >
        <ScreenHeader
          title="30日以上放置"
          titleVariant="heading"
          onBack={() => router.back()}
          trailing={
            items.length === 0 ? null : (
              <Pressable accessibilityRole="button" onPress={selectAll} hitSlop={8}>
                <Text variant="body" style={{ color: theme.ink }}>
                  {selected.size === items.length ? '選択解除' : 'すべて選択'}
                </Text>
              </Pressable>
            )
          }
        />
      </View>

      <FlashList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: layout.screenPadding,
          paddingBottom: 140,
        }}
        ListEmptyComponent={
          isLoading ? null : (
            <EmptyState
              title="放置しているものはありません"
              description="30 日を超えた未読があるとここに集まります"
            />
          )
        }
      />

      {items.length === 0 ? null : (
        <StaleActionBar
          count={selected.size}
          bottomInset={insets.bottom + 24}
          onArchive={() => runBulk('archive')}
          onBump={() => runBulk('bump')}
        />
      )}
    </View>
  );
}
