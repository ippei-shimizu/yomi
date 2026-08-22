import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { radius, typography } from '@/design/tokens';
import { BottomSheet, Button, Text, useThemeColors } from '@/ui';

import { normalizeMemo } from './readConfirm';

/**
 * メモシート。1 行・任意。
 * スキップしても読了そのものは成立する。
 */
export function MemoSheet({
  visible,
  initialValue = '',
  onSave,
  onSkip,
}: {
  visible: boolean;
  initialValue?: string;
  onSave: (memo: string | undefined) => void;
  onSkip: () => void;
}) {
  const theme = useThemeColors();
  const [value, setValue] = useState(initialValue);

  return (
    <BottomSheet visible={visible} onRequestClose={onSkip} dismissOnBackdropPress={false}>
      <Text variant="heading" style={{ color: theme.ink }}>
        ひとこと残す（任意）
      </Text>
      <TextInput
        value={value}
        onChangeText={setValue}
        placeholder="何を得た？"
        placeholderTextColor={theme['ink-3']}
        autoFocus
        multiline
        style={{
          ...typography.body,
          color: theme.ink,
          backgroundColor: theme['surface-muted'],
          borderRadius: radius.card,
          padding: 16,
          minHeight: 88,
        }}
      />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 2 }}>
          <Button label="保存" onPress={() => onSave(normalizeMemo(value))} />
        </View>
        <View style={{ flex: 1 }}>
          <Button label="スキップ" variant="secondary" onPress={onSkip} />
        </View>
      </View>
    </BottomSheet>
  );
}
