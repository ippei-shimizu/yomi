import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDatabase } from '@/db/DatabaseProvider';
import { itemRepo } from '@/db/repositories';
import type { Item } from '@/db/schema';
import { layout, radius } from '@/design/tokens';
import { ItemMemoField } from '@/features/items/detail/ItemMemoField';
import { ItemMetaLine } from '@/features/items/detail/ItemMetaLine';
import { ItemMoreMenu } from '@/features/items/detail/ItemMoreMenu';
import { ItemStatusActions } from '@/features/items/detail/ItemStatusActions';
import { ItemTagRow } from '@/features/items/detail/ItemTagRow';
import { ItemTitleField } from '@/features/items/detail/ItemTitleField';
import { useInvalidateItems, useItem, useItemActions } from '@/features/items/queries';
import { TagPickerSheet } from '@/features/tags/TagPickerSheet';
import { MemoSheet } from '@/features/reading/MemoSheet';
import { ReadConfirmSheet } from '@/features/reading/ReadConfirmSheet';
import { SNOOZE_DAYS } from '@/features/reading/snooze';
import { SnoozeSuggestionSheet } from '@/features/reading/SnoozeSuggestionSheet';
import { useReadFlow } from '@/features/reading/useReadFlow';
import { Button, Card, ScreenHeader, Text, Toast, useThemeColors, useTranslation } from '@/ui';

/** トーストを消すまでの時間 */
const TOAST_MS = 2_000;

export default function ItemDetailScreen() {
  const { id, open } = useLocalSearchParams<{ id: string; open?: string }>();
  const theme = useThemeColors();
  const t = useTranslation();
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
          {t('item.deleted')}
        </Text>
      </View>
    );
  }

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), TOAST_MS);
  };

  const onDelete = () => {
    Alert.alert(t('item.deleteConfirm'), t('common.irreversible'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          // 物理削除は archived からのみ
          if (item.status !== 'archived') itemRepo.archive(db, item.id);
          actions.mutate({ type: 'delete', id: item.id }, { onSuccess: () => router.back() });
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView
        // 入力欄がキーボードに隠れないよう、iOS の自動インセットに任せる
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: layout.screenPadding,
          paddingTop: insets.top + 8,
          paddingBottom: 48,
          gap: layout.sectionGap,
        }}
      >
        <ScreenHeader
          onBack={() => router.back()}
          trailing={
            <ItemMoreMenu
              item={item}
              onRefetchMeta={() => {
                itemRepo.resetMetaStatus(db, item.id);
                void invalidate();
                showToast(t('item.refetching'));
              }}
              onDelete={onDelete}
            />
          }
        />

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

        <ItemTitleField item={item} onSaved={() => void invalidate()} />

        <ItemMetaLine item={item} />

        <ItemTagRow itemId={item.id} onOpenPicker={() => setTagPickerOpen(true)} />

        {item.status === 'read' ? (
          <ItemMemoField item={item} onSaved={() => void invalidate()} />
        ) : null}

        <View style={{ gap: 8 }}>
          <Text variant="caption" style={{ color: theme['ink-2'] }}>
            {t('item.originalUrl')}
          </Text>
          <Card>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('item.copyLink')}
              onPress={() => {
                void Clipboard.setStringAsync(item.url);
                showToast(t('item.copied'));
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
          <Button label={t('common.open')} onPress={() => openBrowser(item)} />
          <ItemStatusActions
            item={item}
            onRead={() => actions.mutate({ type: 'read', id: item.id })}
            onSnooze={() => {
              actions.mutate({ type: 'snooze', id: item.id, days: SNOOZE_DAYS });
              showToast(t('home.snoozed', { count: SNOOZE_DAYS }));
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
