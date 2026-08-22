import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { useDatabase } from '@/db/DatabaseProvider';
import { itemRepo } from '@/db/repositories';
import type { Item } from '@/db/schema';
import { radius, typography } from '@/design/tokens';
import { Text, useThemeColors, useTranslation } from '@/ui';

/**
 * 読了メモ。フォーカスを外した時点で保存する（保存ボタンを置かない）。
 */
export function ItemMemoField({ item, onSaved }: { item: Item; onSaved: () => void }) {
  const theme = useThemeColors();
  const t = useTranslation();
  const db = useDatabase();
  const [value, setValue] = useState(item.memo ?? '');

  return (
    <View style={{ gap: 8 }}>
      <Text variant="caption" style={{ color: theme['ink-2'] }}>
        {t('item.memo')}
      </Text>
      <TextInput
        value={value}
        onChangeText={setValue}
        placeholder={t('item.memoPlaceholder')}
        placeholderTextColor={theme['ink-3']}
        multiline
        onBlur={() => {
          const next = value.trim();
          if (next !== (item.memo ?? '')) {
            itemRepo.update(db, item.id, { memo: next.length > 0 ? next : null });
            onSaved();
          }
        }}
        style={{
          ...typography.body,
          color: theme.ink,
          backgroundColor: theme.surface,
          borderRadius: radius.card,
          padding: 16,
          minHeight: 72,
        }}
      />
    </View>
  );
}
