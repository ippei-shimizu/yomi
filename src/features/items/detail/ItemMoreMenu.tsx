import { Alert, Pressable, Share } from 'react-native';

import type { Item } from '@/db/schema';
import { Text, useThemeColors, useTranslation } from '@/ui';

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
  const t = useTranslation();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('item.moreAccessibility')}
      hitSlop={8}
      onPress={() =>
        Alert.alert(t('item.more'), undefined, [
          { text: t('item.refetchMeta'), onPress: onRefetchMeta },
          { text: t('item.share'), onPress: () => void Share.share({ url: item.url }) },
          { text: t('common.delete'), style: 'destructive', onPress: onDelete },
          { text: t('common.cancel'), style: 'cancel' },
        ])
      }
    >
      <Text variant="heading" script="latin" style={{ color: theme.ink }}>
        ⋯
      </Text>
    </Pressable>
  );
}
