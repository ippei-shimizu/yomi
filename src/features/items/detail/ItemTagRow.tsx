import { View } from 'react-native';

import { useItemTags } from '@/features/tags/queries';
import { Chip, Text, useThemeColors } from '@/ui';

/** 詳細画面のタグ行。＋ でタグ選択シートを開く */
export function ItemTagRow({ itemId, onOpenPicker }: { itemId: string; onOpenPicker: () => void }) {
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
