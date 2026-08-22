import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Item } from '@/db/schema';
import type { MessageKey } from '@/lib/i18n';
import { layout } from '@/design/tokens';
import { displayTitle } from '@/features/items/display';
import { useEntitlement } from '@/domain/entitlement';
import { SOURCES } from '@/domain/url';
import { useItemActions } from '@/features/items/queries';
import { BulkDeleteBar } from '@/features/library/BulkDeleteBar';
import { confirmDelete } from '@/features/library/confirmDelete';
import { FilterRow } from '@/features/library/FilterRow';
import { groupByMonth } from '@/features/library/grouping';
import { LibraryRow } from '@/features/library/LibraryRow';
import { SearchBar } from '@/features/library/SearchBar';
import { useLibraryFilter, useSearchResults } from '@/features/library/useSearch';
import { useTags } from '@/features/tags/queries';
import { EmptyState, Segment, Text, useThemeColors, useTranslation } from '@/ui';

type LibraryTab = 'read' | 'archived';

const TAB_KEYS = [
  { value: 'read', labelKey: 'library.tabRead' },
  { value: 'archived', labelKey: 'library.tabArchived' },
] as const satisfies readonly { value: LibraryTab; labelKey: MessageKey }[];

/** セクション見出しか行か。FlashList に平坦化して渡す */
type Row =
  { kind: 'header'; key: string; label: string } | { kind: 'item'; key: string; item: Item };

export default function LibraryScreen() {
  const theme = useThemeColors();
  const t = useTranslation();
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState<LibraryTab>('read');
  const [selection, setSelection] = useState<Set<string> | null>(null);

  const { limits } = useEntitlement();
  const { filter, setQuery, toggleSource, toggleTag, isActive } = useLibraryFilter();
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading } = useSearchResults(tab, filter, limits.memoSearch);
  const { data: tags = [] } = useTags();
  const actions = useItemActions();

  const rows = useMemo((): Row[] => {
    return groupByMonth(t, data ?? []).flatMap((section) => [
      { kind: 'header' as const, key: `h:${section.key}`, label: section.label },
      ...section.items.map((item) => ({ kind: 'item' as const, key: item.id, item })),
    ]);
  }, [data, t]);

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
        text: t('item.restore'),
        onPress: () => actions.mutate({ type: 'restore', id: item.id }),
      };
      const options =
        tab === 'read'
          ? [
              restore,
              {
                text: t('item.archive'),
                onPress: () => actions.mutate({ type: 'archive', id: item.id }),
              },
            ]
          : [
              restore,
              {
                text: t('common.delete'),
                style: 'destructive' as const,
                onPress: () =>
                  confirmDelete(t, 1, () => actions.mutate({ type: 'delete', id: item.id })),
              },
            ];

      Alert.alert(displayTitle(item), undefined, [
        ...options,
        { text: t('common.cancel'), style: 'cancel' },
      ]);
    },
    [actions, t, tab],
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

      return (
        <LibraryRow
          item={row.item}
          selecting={isSelecting}
          selected={selection?.has(row.item.id) ?? false}
          onPress={() =>
            isSelecting
              ? toggleSelection(row.item.id)
              : router.push({ pathname: '/item/[id]', params: { id: row.item.id } })
          }
          onLongPress={() => (isSelecting ? undefined : onLongPress(row.item))}
        />
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
            {t('library.title')}
          </Text>
          {tab === 'archived' ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setSelection(isSelecting ? null : new Set())}
              hitSlop={8}
            >
              <Text variant="body" style={{ color: theme.ink }}>
                {t(isSelecting ? 'common.cancel' : 'library.select')}
              </Text>
            </Pressable>
          ) : null}
        </View>
        <Segment
          options={TAB_KEYS.map((entry) => ({ value: entry.value, label: t(entry.labelKey) }))}
          value={tab}
          onChange={(next) => {
            setTab(next);
            setSelection(null);
          }}
        />

        <SearchBar
          value={filter.query}
          onChangeText={setQuery}
          filterActive={isActive}
          onPressFilter={() => setShowFilters((current) => !current)}
        />

        {limits.memoSearch ? null : (
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              router.push({ pathname: '/paywall', params: { trigger: 'memo_search' } })
            }
          >
            <Text variant="caption" style={{ color: theme['ink-2'] }}>
              {t('library.memoSearchIsPro')}
            </Text>
          </Pressable>
        )}

        {showFilters ? (
          <View style={{ gap: 8 }}>
            <FilterRow
              label={t('library.filterSource')}
              chips={SOURCES.map((source) => ({
                key: source,
                label: source,
                selected: filter.sources.includes(source),
                onPress: () => toggleSource(source),
              }))}
            />
            {tags.length === 0 ? null : (
              <FilterRow
                label={t('library.filterTag')}
                chips={tags.map((tag) => ({
                  key: tag.id,
                  label: tag.name,
                  selected: filter.tagIds.includes(tag.id),
                  onPress: () => toggleTag(tag.id),
                }))}
              />
            )}
          </View>
        ) : null}
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
              title={t(
                isActive
                  ? 'library.emptyFiltered'
                  : tab === 'read'
                    ? 'library.emptyRead'
                    : 'library.emptyArchived',
              )}
              description={t(
                isActive
                  ? 'library.emptyFilteredDescription'
                  : tab === 'read'
                    ? 'library.emptyReadDescription'
                    : 'library.emptyArchivedDescription',
              )}
            />
          )
        }
      />

      {isSelecting && selection.size > 0 ? (
        <BulkDeleteBar
          count={selection.size}
          onDelete={() =>
            confirmDelete(t, selection.size, () => {
              actions.mutate({ type: 'deleteMany', ids: [...selection] });
              setSelection(new Set());
            })
          }
        />
      ) : null}
    </View>
  );
}
