import { useState } from 'react';
import { Pressable, TextInput } from 'react-native';

import { useDatabase } from '@/db/DatabaseProvider';
import { itemRepo } from '@/db/repositories';
import type { Item } from '@/db/schema';
import { typography } from '@/design/tokens';
import { displayTitle } from '@/features/items/display';
import { Text, useThemeColors, useTranslation } from '@/ui';

/**
 * タップで編集に切り替わるタイトル。メタ取得が外した時に手で直せるようにする。
 */
export function ItemTitleField({ item, onSaved }: { item: Item; onSaved: () => void }) {
  const theme = useThemeColors();
  const t = useTranslation();
  const db = useDatabase();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(() => displayTitle(item));

  if (!editing) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('item.editTitle')}
        onPress={() => {
          setValue(displayTitle(item));
          setEditing(true);
        }}
      >
        <Text variant="display" style={{ color: theme.ink }}>
          {displayTitle(item)}
        </Text>
      </Pressable>
    );
  }

  return (
    <TextInput
      value={value}
      onChangeText={setValue}
      autoFocus
      multiline
      onBlur={() => {
        const trimmed = value.trim();
        // 空にはできない。空欄で確定するとホスト名にも戻せなくなる
        if (trimmed.length > 0 && trimmed !== item.title) {
          itemRepo.update(db, item.id, { title: trimmed });
          onSaved();
        }
        setEditing(false);
      }}
      style={{ ...typography.display, color: theme.ink }}
    />
  );
}
