import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { layout, radius, typography } from '@/design/tokens';
import { useEntitlement } from '@/domain/entitlement';
import { useTagActions, useTagsWithUsage } from '@/features/tags/queries';
import { tagNameErrorMessage, validateTagName } from '@/features/tags/tagName';
import { Card, EmptyState, Text, useThemeColors } from '@/ui';

/** Settings → タグ管理（docs/Screens.md S11） */
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
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
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
        <Text variant="display" style={{ color: theme.ink }}>
          タグ管理
        </Text>
      </View>

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
          <Card key={tag.id}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
              }}
            >
              {editingId === tag.id ? (
                <TagNameInput
                  initialValue={tag.name}
                  existingNames={tags.filter((t) => t.id !== tag.id).map((t) => t.name)}
                  onCommit={(name) => {
                    actions.mutate({ type: 'rename', id: tag.id, name });
                    setEditingId(null);
                  }}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${tag.name} の名前を変更`}
                  onPress={() => setEditingId(tag.id)}
                  style={{ flex: 1 }}
                >
                  <Text variant="body" style={{ color: theme.ink }}>
                    {tag.name}
                  </Text>
                </Pressable>
              )}

              <Text variant="caption" script="latin" style={{ color: theme['ink-2'] }}>
                {tag.usageCount}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${tag.name} を削除`}
                onPress={() => onDelete(tag.id, tag.name, tag.usageCount)}
                hitSlop={8}
              >
                <Text variant="body" script="latin" style={{ color: theme['ink-2'] }}>
                  ✕
                </Text>
              </Pressable>
            </View>
          </Card>
        ))
      )}
    </ScrollView>
  );
}

function TagNameInput({
  initialValue,
  existingNames,
  onCommit,
  onCancel,
}: {
  initialValue: string;
  existingNames: string[];
  onCommit: (name: string) => void;
  onCancel: () => void;
}) {
  const theme = useThemeColors();
  const [value, setValue] = useState(initialValue);

  return (
    <TextInput
      value={value}
      onChangeText={setValue}
      autoFocus
      returnKeyType="done"
      onBlur={() => {
        const result = validateTagName(value, existingNames);
        // 不正な名前で確定させない。元の名前のまま編集を終える
        if (result.ok) onCommit(result.name);
        else {
          if (result.error !== 'empty') Alert.alert(tagNameErrorMessage(result.error));
          onCancel();
        }
      }}
      style={{
        ...typography.body,
        flex: 1,
        color: theme.ink,
        backgroundColor: theme['surface-muted'],
        borderRadius: radius.icon,
        paddingHorizontal: 12,
        height: 36,
      }}
    />
  );
}
