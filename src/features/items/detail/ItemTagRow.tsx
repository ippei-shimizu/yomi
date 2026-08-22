import { View } from 'react-native';

import { useItemTags } from '@/features/tags/queries';
import { Chip, Text, useThemeColors, useTranslation } from '@/ui';

/** 詳細画面のタグ行。＋ でタグ選択シートを開く */
export function ItemTagRow({ itemId, onOpenPicker }: { itemId: string; onOpenPicker: () => void }) {
  const theme = useThemeColors();
  const t = useTranslation();
  const { data: tags = [] } = useItemTags(itemId);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
      <Text variant="caption" style={{ color: theme['ink-2'] }}>
        {t('item.tags')}
      </Text>
      {tags.map((tag) => (
        <Chip key={tag.id} label={tag.name} selected onPress={onOpenPicker} />
      ))}
      <Chip label={t('item.addTag')} onPress={onOpenPicker} />
    </View>
  );
}
