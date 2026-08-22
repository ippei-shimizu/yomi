import { View } from 'react-native';

import { SNOOZE_DAYS } from '@/features/reading/snooze';
import { BottomSheet, Button, Text, useThemeColors } from '@/ui';

/**
 * 開いてすぐ戻ってきた時に出す「あとでにしますか？」。
 *
 * 読まなかったことを咎めない。そのままにする選択肢を必ず並べて置く。
 */
export function SnoozeSuggestionSheet({
  visible,
  onAccept,
  onDismiss,
}: {
  visible: boolean;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  const theme = useThemeColors();

  return (
    <BottomSheet visible={visible} onRequestClose={onDismiss}>
      <Text variant="heading" style={{ color: theme.ink, textAlign: 'center' }}>
        あとでにしますか？
      </Text>
      <Text variant="caption" style={{ color: theme['ink-2'], textAlign: 'center' }}>
        {SNOOZE_DAYS} 日後にもう一度お知らせします
      </Text>
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
        <View style={{ flex: 1 }}>
          <Button label="あとで" onPress={onAccept} />
        </View>
        <View style={{ flex: 1 }}>
          <Button label="このまま" variant="secondary" onPress={onDismiss} />
        </View>
      </View>
    </BottomSheet>
  );
}
