import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Item } from '@/db/schema';
import { layout, radius } from '@/design/tokens';
import { useEntitlement } from '@/domain/entitlement';
import { displayTitle } from '@/features/items/display';
import { ItemRow } from '@/features/items/ItemRow';
import { useItemActions, useStaleItems } from '@/features/items/queries';
import { Button, EmptyState, Text, useThemeColors } from '@/ui';

/**
 * S10 Stale Items（docs/Screens.md S10）。
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

  /** 一括操作は Pro（docs/PRD.md §7.5）。無料は一覧の閲覧まで */
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
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: selected.has(item.id) }}
        accessibilityLabel={displayTitle(item)}
        onPress={() => toggle(item.id)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: layout.cardGap }}
      >
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: radius.pill,
            borderWidth: 2,
            borderColor: selected.has(item.id) ? theme.ink : theme['ink-3'],
            backgroundColor: selected.has(item.id) ? theme.ink : 'transparent',
          }}
        />
        <View style={{ flex: 1 }}>
          <ItemRow item={item} />
        </View>
      </Pressable>
    ),
    [selected, theme, toggle],
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingHorizontal: layout.screenPadding,
          paddingTop: insets.top + 8,
          paddingBottom: layout.cardGap,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="戻る"
          onPress={() => router.back()}
          hitSlop={8}
        >
          <Text variant="heading" script="latin" style={{ color: theme.ink }}>
            ←
          </Text>
        </Pressable>
        <Text variant="heading" style={{ flex: 1, color: theme.ink }}>
          30日以上放置
        </Text>
        {items.length === 0 ? null : (
          <Pressable accessibilityRole="button" onPress={selectAll} hitSlop={8}>
            <Text variant="body" style={{ color: theme.ink }}>
              {selected.size === items.length ? '選択解除' : 'すべて選択'}
            </Text>
          </Pressable>
        )}
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
        <View
          style={{
            position: 'absolute',
            left: layout.screenPadding,
            right: layout.screenPadding,
            bottom: insets.bottom + 24,
            flexDirection: 'row',
            gap: 12,
          }}
        >
          <View style={{ flex: 1 }}>
            <Button
              label={`アーカイブ (${selected.size})`}
              variant="secondary"
              onPress={() => runBulk('archive')}
              disabled={selected.size === 0}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              label={`今週読む (${selected.size})`}
              onPress={() => runBulk('bump')}
              disabled={selected.size === 0}
            />
          </View>
        </View>
      )}
    </View>
  );
}
