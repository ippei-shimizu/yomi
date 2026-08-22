import { Pressable, View } from 'react-native';

import type { Item } from '@/db/schema';
import { layout } from '@/design/tokens';
import { displayTitle } from '@/features/items/display';
import { ItemRow } from '@/features/items/ItemRow';
import { memoPreview } from '@/features/library/grouping';
import { SelectionCheckbox, Text, useThemeColors } from '@/ui';

/**
 * ライブラリの 1 行。ItemRow にメモの冒頭と選択チェックを足したもの。
 *
 * 長押しで何をするかは呼び出し側が決める。選択中に長押しメニューを出すと
 * チェックの付け外しと競合するため、そこでは何もしないハンドラを渡す。
 */
export function LibraryRow({
  item,
  selecting,
  selected,
  onPress,
  onLongPress,
}: {
  item: Item;
  selecting: boolean;
  selected: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const theme = useThemeColors();
  const preview = memoPreview(item.memo);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={displayTitle(item)}
      onPress={onPress}
      onLongPress={onLongPress}
      style={{
        marginBottom: layout.cardGap,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
      }}
    >
      {selecting ? <SelectionCheckbox selected={selected} /> : null}
      <View style={{ flex: 1 }}>
        <ItemRow item={item} />
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
}
