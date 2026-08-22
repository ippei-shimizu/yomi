import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { layout } from '@/design/tokens';
import { useEntitlement } from '@/domain/entitlement';
import { useTagActions, useTagsWithUsage } from '@/features/tags/queries';
import { TagManagementRow } from '@/features/tags/TagManagementRow';
import { EmptyState, ScreenHeader, Text, useThemeColors } from '@/ui';

/** Settings → タグ管理 */
export default function TagSettingsScreen() {
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const { limits } = useEntitlement();

  const { data: tags = [] } = useTagsWithUsage();
  const actions = useTagActions();
  const [editingId, setEditingId] = useState<string | null>(null);

  const onDelete = (id: string, name: string, usageCount: number) => {
    Alert.alert(
      `「${name}」を削除しますか？`,
      usageCount > 0
        ? `${usageCount} 件のアイテムからタグが外れます。アイテム自体は残ります。`
        : undefined,
      [
        { text: 'やめる', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: () => actions.mutate({ type: 'delete', id }),
        },
      ],
    );
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{
        paddingHorizontal: layout.screenPadding,
        paddingTop: insets.top + 8,
        paddingBottom: 48,
        gap: layout.cardGap,
      }}
    >
      <ScreenHeader title="タグ管理" onBack={() => router.back()} />

      {limits.tagLimit === null ? null : (
        <Text variant="caption" style={{ color: theme['ink-2'] }}>
          無料プランのタグは {limits.tagLimit} 個まで（現在 {tags.length} 個）
        </Text>
      )}

      {tags.length === 0 ? (
        <EmptyState
          title="タグはまだありません"
          description="アイテムの詳細画面か、共有シートから付けられます"
        />
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
