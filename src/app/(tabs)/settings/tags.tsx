import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { layout } from '@/design/tokens';
import { useEntitlement } from '@/domain/entitlement';
import { useTagActions, useTagsWithUsage } from '@/features/tags/queries';
import { TagManagementRow } from '@/features/tags/TagManagementRow';
import { EmptyState, ScreenHeader, Text, useThemeColors, useTranslation } from '@/ui';

/** Settings → タグ管理 */
export default function TagSettingsScreen() {
  const theme = useThemeColors();
  const t = useTranslation();
  const insets = useSafeAreaInsets();
  const { limits } = useEntitlement();

  const { data: tags = [] } = useTagsWithUsage();
  const actions = useTagActions();
  const [editingId, setEditingId] = useState<string | null>(null);

  const onDelete = (id: string, name: string, usageCount: number) => {
    Alert.alert(
      t('tags.deleteConfirm', { name }),
      usageCount > 0 ? t('tags.deleteConfirmUsed', { count: usageCount }) : undefined,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => actions.mutate({ type: 'delete', id }),
        },
      ],
    );
  };

  return (
    <ScrollView
      // 入力欄がキーボードに隠れないよう、iOS の自動インセットに任せる
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{
        paddingHorizontal: layout.screenPadding,
        paddingTop: insets.top + 8,
        paddingBottom: 48,
        gap: layout.cardGap,
      }}
    >
      <ScreenHeader title={t('tags.title')} onBack={() => router.back()} />

      {limits.tagLimit === null ? null : (
        <Text variant="caption" style={{ color: theme['ink-2'] }}>
          {t('tags.limit', { limit: limits.tagLimit, count: tags.length })}
        </Text>
      )}

      {tags.length === 0 ? (
        <EmptyState title={t('tags.emptyTitle')} description={t('tags.emptyDescription')} />
      ) : (
        tags.map((tag) => (
          <TagManagementRow
            key={tag.id}
            name={tag.name}
            usageCount={tag.usageCount}
            editing={editingId === tag.id}
            otherNames={tags.filter((other) => other.id !== tag.id).map((other) => other.name)}
            onStartEditing={() => setEditingId(tag.id)}
            onRename={(name) => {
              actions.mutate({ type: 'rename', id: tag.id, name });
              setEditingId(null);
            }}
            onCancelEditing={() => setEditingId(null)}
            onDelete={() => onDelete(tag.id, tag.name, tag.usageCount)}
          />
        ))
      )}
    </ScrollView>
  );
}
