import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Share, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDatabase } from '@/db/DatabaseProvider';
import { itemRepo } from '@/db/repositories';
import type { Item } from '@/db/schema';
import { layout, radius, typography } from '@/design/tokens';
import { displayTitle } from '@/features/items/display';
import { useInvalidateItems, useItem, useItemActions } from '@/features/items/queries';
import { useItemTags } from '@/features/tags/queries';
import { TagPickerSheet } from '@/features/tags/TagPickerSheet';
import { MemoSheet } from '@/features/reading/MemoSheet';
import { ReadConfirmSheet } from '@/features/reading/ReadConfirmSheet';
import { useReadFlow } from '@/features/reading/useReadFlow';
import { BottomSheet, Button, Card, Chip, SourceIcon, Text, Toast, useThemeColors } from '@/ui';

const SNOOZE_DAYS = 7;

export default function ItemDetailScreen() {
  const { id, open } = useLocalSearchParams<{ id: string; open?: string }>();
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();

  const db = useDatabase();
  const invalidate = useInvalidateItems();
  const { data: item, isLoading } = useItem(id);
  const actions = useItemActions();
  const readFlow = useReadFlow();

  const [toast, setToast] = useState<string | null>(null);
  const [tagPickerOpen, setTagPickerOpen] = useState(false);
  // 通知やホームからの ?open=1 で 1 度だけ自動的にブラウザを開く
  const autoOpened = useRef(false);

  const openBrowser = useCallback(
    (target: Item) => {
      void readFlow.open(target);
    },
    [readFlow],
  );

  useEffect(() => {
    if (open !== '1' || autoOpened.current || !item) return;
    autoOpened.current = true;
    openBrowser(item);
  }, [open, item, openBrowser]);

  if (isLoading) return <View style={{ flex: 1, backgroundColor: theme.bg }} />;

  if (!item) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.bg,
        }}
      >
        <Text variant="body" style={{ color: theme['ink-2'] }}>
          このアイテムは削除されています
        </Text>
      </View>
    );
  }

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2_000);
  };

  const onDelete = () => {
    Alert.alert('削除しますか？', 'この操作は取り消せません。', [
      { text: 'やめる', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: () => {
          // 物理削除は archived からのみ（docs/DesignDoc.md §4.2）
          if (item.status !== 'archived') itemRepo.archive(db, item.id);
          actions.mutate({ type: 'delete', id: item.id }, { onSuccess: () => router.back() });
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: layout.screenPadding,
          paddingTop: insets.top + 8,
          paddingBottom: 48,
          gap: layout.sectionGap,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
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
          <MoreMenu
            item={item}
            onRefetchMeta={() => {
              itemRepo.resetMetaStatus(db, item.id);
              void invalidate();
              showToast('再取得します');
            }}
            onDelete={onDelete}
          />
        </View>

        {item.thumbnailUrl === null ? null : (
          <Image
            source={{ uri: item.thumbnailUrl }}
            style={{
              width: '100%',
              aspectRatio: 16 / 9,
              borderRadius: radius.card,
              backgroundColor: theme['surface-muted'],
            }}
          />
        )}

        <TitleField item={item} onSaved={() => void invalidate()} />

        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <SourceIcon source={item.source} size={16} />
            <Text variant="caption" style={{ color: theme['ink-2'] }}>
              {item.siteName ?? new URL(item.url).hostname}
              {item.author === null ? '' : ` · @${item.author.replace(/^@/, '')}`}
            </Text>
          </View>
          <Text variant="caption" script="latin" style={{ color: theme['ink-2'] }}>
            保存: {formatDate(item.savedAt)}
            {item.readAt === null ? '' : `  読了: ${formatDate(item.readAt)}`}
          </Text>
        </View>

        <TagRow itemId={item.id} onOpenPicker={() => setTagPickerOpen(true)} />

        {item.status === 'read' ? (
          <MemoField item={item} onSaved={() => void invalidate()} />
        ) : null}

        <View style={{ gap: 8 }}>
          <Text variant="caption" style={{ color: theme['ink-2'] }}>
            元の URL
          </Text>
          <Card>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="リンクをコピー"
              onPress={() => {
                void Clipboard.setStringAsync(item.url);
                showToast('コピーしました');
              }}
              style={{ padding: 16 }}
            >
              <Text variant="caption" script="latin" numberOfLines={2} style={{ color: theme.ink }}>
                {item.url}
              </Text>
            </Pressable>
          </Card>
        </View>

        <View style={{ gap: 12 }}>
          <Button label="開く" onPress={() => openBrowser(item)} />
          <StatusActions
            item={item}
            onRead={() => actions.mutate({ type: 'read', id: item.id })}
            onSnooze={() => {
              actions.mutate({ type: 'snooze', id: item.id, days: SNOOZE_DAYS });
              showToast(`${SNOOZE_DAYS} 日後にまた出します`);
            }}
            onArchive={() => actions.mutate({ type: 'archive', id: item.id })}
            onRestore={() => actions.mutate({ type: 'restore', id: item.id })}
          />
        </View>
      </ScrollView>

      {toast === null ? null : (
        <View style={{ position: 'absolute', bottom: 32, left: 0, right: 0 }}>
          <Toast message={toast} />
        </View>
      )}

      <TagPickerSheet
        itemId={item.id}
        visible={tagPickerOpen}
        onClose={() => setTagPickerOpen(false)}
        onRequestPaywall={() => {
          setTagPickerOpen(false);
          router.push({ pathname: '/paywall', params: { trigger: 'limit_tag' } });
        }}
      />

      <ReadConfirmSheet
        visible={readFlow.step === 'confirm'}
        onRead={readFlow.confirmRead}
        onNotYet={readFlow.confirmNotYet}
      />
      <MemoSheet
        visible={readFlow.step === 'memo'}
        onSave={(memo) => {
          actions.mutate({ type: 'read', id: item.id, memo });
          readFlow.dismiss();
        }}
        onSkip={() => {
          actions.mutate({ type: 'read', id: item.id });
          readFlow.dismiss();
        }}
      />
      <SnoozeSuggestionSheet
        visible={readFlow.step === 'suggest-snooze'}
        onAccept={() => {
          actions.mutate({ type: 'snooze', id: item.id, days: SNOOZE_DAYS });
          readFlow.acceptSnooze();
        }}
        onDismiss={readFlow.dismiss}
      />
    </View>
  );
}

/** S03 のタグ行。+ で Tag Picker を開く */
function TagRow({ itemId, onOpenPicker }: { itemId: string; onOpenPicker: () => void }) {
  const theme = useThemeColors();
  const { data: tags = [] } = useItemTags(itemId);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
      <Text variant="caption" style={{ color: theme['ink-2'] }}>
        タグ
      </Text>
      {tags.map((tag) => (
        <Chip key={tag.id} label={tag.name} selected onPress={onOpenPicker} />
      ))}
      <Chip label="＋" onPress={onOpenPicker} />
    </View>
  );
}

function formatDate(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function TitleField({ item, onSaved }: { item: Item; onSaved: () => void }) {
  const theme = useThemeColors();
  const db = useDatabase();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(() => displayTitle(item));

  if (!editing) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="タイトルを編集"
        onPress={() => {
          setValue(displayTitle(item));
          setEditing(true);
        }}
      >
        <Text variant="display" style={{ color: theme.ink }}>
          {displayTitle(item)}
        </Text>
      </Pressable>
    );
  }

  return (
    <TextInput
      value={value}
      onChangeText={setValue}
      autoFocus
      multiline
      onBlur={() => {
        const trimmed = value.trim();
        // 空にはできない。空欄で確定するとホスト名にも戻せなくなる
        if (trimmed.length > 0 && trimmed !== item.title) {
          itemRepo.update(db, item.id, { title: trimmed });
          onSaved();
        }
        setEditing(false);
      }}
      style={{ ...typography.display, color: theme.ink }}
    />
  );
}

function MemoField({ item, onSaved }: { item: Item; onSaved: () => void }) {
  const theme = useThemeColors();
  const db = useDatabase();
  const [value, setValue] = useState(item.memo ?? '');

  return (
    <View style={{ gap: 8 }}>
      <Text variant="caption" style={{ color: theme['ink-2'] }}>
        メモ
      </Text>
      <TextInput
        value={value}
        onChangeText={setValue}
        placeholder="何を得た？"
        placeholderTextColor={theme['ink-3']}
        multiline
        onBlur={() => {
          const next = value.trim();
          if (next !== (item.memo ?? '')) {
            itemRepo.update(db, item.id, { memo: next.length > 0 ? next : null });
            onSaved();
          }
        }}
        style={{
          ...typography.body,
          color: theme.ink,
          backgroundColor: theme.surface,
          borderRadius: radius.card,
          padding: 16,
          minHeight: 72,
        }}
      />
    </View>
  );
}

/** 状態に応じてボタンを出し分ける（docs/Screens.md S03） */
function StatusActions({
  item,
  onRead,
  onSnooze,
  onArchive,
  onRestore,
}: {
  item: Item;
  onRead: () => void;
  onSnooze: () => void;
  onArchive: () => void;
  onRestore: () => void;
}) {
  const buttons =
    item.status === 'unread'
      ? [
          { label: '読んだ', onPress: onRead },
          { label: 'あとで', onPress: onSnooze },
          { label: 'アーカイブ', onPress: onArchive },
        ]
      : item.status === 'read'
        ? [
            { label: '未読に戻す', onPress: onRestore },
            { label: 'アーカイブ', onPress: onArchive },
          ]
        : [{ label: '未読に戻す', onPress: onRestore }];

  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {buttons.map((button) => (
        <View key={button.label} style={{ flex: 1 }}>
          <Button label={button.label} variant="secondary" onPress={button.onPress} />
        </View>
      ))}
    </View>
  );
}

function MoreMenu({
  item,
  onRefetchMeta,
  onDelete,
}: {
  item: Item;
  onRefetchMeta: () => void;
  onDelete: () => void;
}) {
  const theme = useThemeColors();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="その他の操作"
      hitSlop={8}
      onPress={() =>
        Alert.alert('その他', undefined, [
          { text: 'メタデータを再取得', onPress: onRefetchMeta },
          { text: '共有', onPress: () => void Share.share({ url: item.url }) },
          { text: '削除', style: 'destructive', onPress: onDelete },
          { text: 'やめる', style: 'cancel' },
        ])
      }
    >
      <Text variant="heading" script="latin" style={{ color: theme.ink }}>
        ⋯
      </Text>
    </Pressable>
  );
}

function SnoozeSuggestionSheet({
  visible,
  onAccept,
  onDismiss,
}: {
  visible: boolean;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  const theme = useThemeColors();

  return (
    <BottomSheet visible={visible} onRequestClose={onDismiss}>
      <Text variant="heading" style={{ color: theme.ink, textAlign: 'center' }}>
        あとでにしますか？
      </Text>
      <Text variant="caption" style={{ color: theme['ink-2'], textAlign: 'center' }}>
        {SNOOZE_DAYS} 日後にもう一度お知らせします
      </Text>
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
        <View style={{ flex: 1 }}>
          <Button label="あとで" onPress={onAccept} />
        </View>
        <View style={{ flex: 1 }}>
          <Button label="このまま" variant="secondary" onPress={onDismiss} />
        </View>
      </View>
    </BottomSheet>
  );
}
