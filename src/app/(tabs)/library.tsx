import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Item } from '@/db/schema';
import { layout, radius } from '@/design/tokens';
import { displayTitle } from '@/features/items/display';
import { ItemRow } from '@/features/items/ItemRow';
import { useItemActions, useLibraryItems } from '@/features/items/queries';
import { groupByMonth, memoPreview } from '@/features/library/grouping';
import { EmptyState, Segment, Text, useThemeColors } from '@/ui';

type LibraryTab = 'read' | 'archived';

const TABS = [
  { value: 'read', label: '既読' },
  { value: 'archived', label: 'アーカイブ' },
] as const satisfies readonly { value: LibraryTab; label: string }[];

/** セクション見出しか行か。FlashList に平坦化して渡す */
type Row =
  { kind: 'header'; key: string; label: string } | { kind: 'item'; key: string; item: Item };

export default function LibraryScreen() {
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState<LibraryTab>('read');
  const [selection, setSelection] = useState<Set<string> | null>(null);

  const { data, isLoading } = useLibraryItems(tab);
  const actions = useItemActions();

  const rows = useMemo((): Row[] => {
    return groupByMonth(data ?? []).flatMap((section) => [
      { kind: 'header' as const, key: `h:${section.key}`, label: section.label },
      ...section.items.map((item) => ({ kind: 'item' as const, key: item.id, item })),
    ]);
  }, [data]);

  const isSelecting = selection !== null;

  const toggleSelection = useCallback((id: string) => {
    setSelection((current) => {
      if (current === null) return current;
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const onLongPress = useCallback(
    (item: Item) => {
      const restore = {
        text: '未読に戻す',
        onPress: () => actions.mutate({ type: 'restore', id: item.id }),
      };
      const options =
        tab === 'read'
          ? [
              restore,
              {
                text: 'アーカイブ',
                onPress: () => actions.mutate({ type: 'archive', id: item.id }),
              },
            ]
          : [
              restore,
              {
                text: '削除',
                style: 'destructive' as const,
                onPress: () =>
                  confirmDelete([item.id], () => actions.mutate({ type: 'delete', id: item.id })),
              },
            ];

      Alert.alert(displayTitle(item), undefined, [...options, { text: 'やめる', style: 'cancel' }]);
    },
    [actions, tab],
  );

  const renderRow = useCallback(
    ({ item: row }: { item: Row }) => {
      if (row.kind === 'header') {
        return (
          <Text
            variant="heading"
            style={{ color: theme.ink, marginTop: layout.sectionGap, marginBottom: layout.cardGap }}
          >
            {row.label}
          </Text>
        );
      }

      const selected = selection?.has(row.item.id) ?? false;
      const preview = memoPreview(row.item.memo);

      return (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected }}
          accessibilityLabel={displayTitle(row.item)}
          onPress={() =>
            isSelecting
              ? toggleSelection(row.item.id)
              : router.push({ pathname: '/item/[id]', params: { id: row.item.id } })
          }
          onLongPress={() => (isSelecting ? undefined : onLongPress(row.item))}
          style={{
            marginBottom: layout.cardGap,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {isSelecting ? (
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: radius.pill,
                borderWidth: 2,
                borderColor: selected ? theme.ink : theme['ink-3'],
                backgroundColor: selected ? theme.ink : 'transparent',
              }}
            />
          ) : null}
          <View style={{ flex: 1 }}>
            <ItemRow item={row.item} />
            {preview === null ? null : (
              <Text
                variant="caption"
                numberOfLines={1}
                style={{ color: theme['ink-2'], paddingHorizontal: 12, paddingTop: 4 }}
              >
                📝 {preview}
              </Text>
            )}
          </View>
        </Pressable>
      );
    },
    [isSelecting, onLongPress, selection, theme, toggleSelection],
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View
        style={{
          paddingHorizontal: layout.screenPadding,
          paddingTop: insets.top + 8,
          gap: layout.cardGap,
        }}
      >
        <View
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Text variant="display" style={{ color: theme.ink }}>
            Library
          </Text>
          {tab === 'archived' ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setSelection(isSelecting ? null : new Set())}
              hitSlop={8}
            >
              <Text variant="body" style={{ color: theme.ink }}>
                {isSelecting ? 'やめる' : '選択'}
              </Text>
            </Pressable>
          ) : null}
        </View>
        <Segment
          options={TABS}
          value={tab}
          onChange={(next) => {
            setTab(next);
            setSelection(null);
          }}
        />
      </View>

      <FlashList
        data={rows}
        renderItem={renderRow}
        keyExtractor={(row) => row.key}
        contentContainerStyle={{
          paddingHorizontal: layout.screenPadding,
          paddingBottom: layout.listBottomInset,
        }}
        ListEmptyComponent={
          isLoading ? null : (
            <EmptyState
              title={tab === 'read' ? 'まだ読了はありません' : 'アーカイブは空です'}
              description={
                tab === 'read'
                  ? '読み終えた記事とメモがここに残ります'
                  : '捨てたものがここに入ります'
              }
            />
          )
        }
      />

      {isSelecting && selection.size > 0 ? (
        <BulkDeleteBar
          count={selection.size}
          onDelete={() =>
            confirmDelete([...selection], () => {
              actions.mutate({ type: 'deleteMany', ids: [...selection] });
              setSelection(new Set());
            })
          }
        />
      ) : null}
    </View>
  );
}

function confirmDelete(ids: string[], onConfirm: () => void): void {
  Alert.alert(`${ids.length} 件を削除しますか？`, 'この操作は取り消せません。', [
    { text: 'やめる', style: 'cancel' },
    { text: '削除', style: 'destructive', onPress: onConfirm },
  ]);
}

function BulkDeleteBar({ count, onDelete }: { count: number; onDelete: () => void }) {
  const theme = useThemeColors();

  return (
    <View
      style={{
        position: 'absolute',
        left: layout.screenPadding,
        right: layout.screenPadding,
        bottom: layout.listBottomInset,
      }}
    >
      <Pressable
        accessibilityRole="button"
        onPress={onDelete}
        style={{
          height: layout.buttonHeight,
          borderRadius: radius.pill,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.ink,
        }}
      >
        <Text variant="heading" style={{ color: theme.surface }}>
          削除 ({count})
        </Text>
      </Pressable>
    </View>
  );
}
