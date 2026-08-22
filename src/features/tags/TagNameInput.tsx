import { useState } from 'react';
import { Alert, TextInput } from 'react-native';

import { radius, typography } from '@/design/tokens';
import { tagNameErrorMessage, validateTagName } from '@/features/tags/tagName';
import { useThemeColors, useTranslation } from '@/ui';

/**
 * タグ名のインライン編集。フォーカスを外した時点で確定する。
 *
 * 不正な名前では確定させず、元の名前のまま編集を終える。
 * 空欄はうっかり触っただけの可能性が高いので、警告を出さず黙って戻す。
 */
export function TagNameInput({
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
  const t = useTranslation();
  const [value, setValue] = useState(initialValue);

  return (
    <TextInput
      value={value}
      onChangeText={setValue}
      autoFocus
      returnKeyType="done"
      onBlur={() => {
        const result = validateTagName(value, existingNames);
        if (result.ok) {
          onCommit(result.name);
          return;
        }
        if (result.error !== 'empty') Alert.alert(tagNameErrorMessage(t, result.error));
        onCancel();
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
