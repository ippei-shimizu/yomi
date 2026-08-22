import { Alert, Pressable, Share } from 'react-native';

import type { Item } from '@/db/schema';
import { Text, useThemeColors } from '@/ui';

/** 詳細画面右上の ⋯。頻度の低い操作をここに退避する */
export function ItemMoreMenu({
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
