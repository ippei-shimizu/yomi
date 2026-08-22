import { Pressable, View } from 'react-native';

import { TagNameInput } from '@/features/tags/TagNameInput';
import { Card, Text, useThemeColors } from '@/ui';

/**
 * タグ管理画面の 1 行。名前・使用数・削除。
 *
 * 使用数を必ず添える。0 件のタグと 40 件のタグでは、消す時の重みが違う。
 */
export function TagManagementRow({
  name,
  usageCount,
  editing,
  otherNames,
  onStartEditing,
  onRename,
  onCancelEditing,
  onDelete,
}: {
  name: string;
  usageCount: number;
  editing: boolean;
  otherNames: string[];
  onStartEditing: () => void;
  onRename: (name: string) => void;
  onCancelEditing: () => void;
  onDelete: () => void;
}) {
  const theme = useThemeColors();

  return (
    <Card>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingHorizontal: 16,
          paddingVertical: 14,
        }}
      >
        {editing ? (
          <TagNameInput
            initialValue={name}
            existingNames={otherNames}
            onCommit={onRename}
            onCancel={onCancelEditing}
          />
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${name} の名前を変更`}
            onPress={onStartEditing}
            style={{ flex: 1 }}
          >
            <Text variant="body" style={{ color: theme.ink }}>
              {name}
            </Text>
          </Pressable>
        )}

        <Text variant="caption" script="latin" style={{ color: theme['ink-2'] }}>
          {usageCount}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${name} を削除`}
          onPress={onDelete}
          hitSlop={8}
        >
          <Text variant="body" script="latin" style={{ color: theme['ink-2'] }}>
            ✕
          </Text>
        </Pressable>
      </View>
    </Card>
  );
}
