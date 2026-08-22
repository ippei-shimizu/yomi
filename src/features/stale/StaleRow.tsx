import { Pressable, View } from 'react-native';

import type { Item } from '@/db/schema';
import { layout } from '@/design/tokens';
import { displayTitle } from '@/features/items/display';
import { ItemRow } from '@/features/items/ItemRow';
import { SelectionCheckbox } from '@/ui';

/** 放置整理の 1 行。この画面では常に選択モード */
export function StaleRow({
  item,
  selected,
  onToggle,
}: {
  item: Item;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={displayTitle(item)}
      onPress={onToggle}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: layout.cardGap }}
    >
      <SelectionCheckbox selected={selected} />
      <View style={{ flex: 1 }}>
        <ItemRow item={item} />
      </View>
    </Pressable>
  );
}
