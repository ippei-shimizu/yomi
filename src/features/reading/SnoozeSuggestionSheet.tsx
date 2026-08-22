import { View } from 'react-native';

import { SNOOZE_DAYS } from '@/features/reading/snooze';
import { BottomSheet, Button, Text, useThemeColors, useTranslation } from '@/ui';

/**
 * 開いてすぐ戻ってきた時に出す「{t('read.snoozeTitle')}」。
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
  const t = useTranslation();

  return (
    <BottomSheet visible={visible} onRequestClose={onDismiss}>
      <Text variant="heading" style={{ color: theme.ink, textAlign: 'center' }}>
        {t('read.snoozeTitle')}
      </Text>
      <Text variant="caption" style={{ color: theme['ink-2'], textAlign: 'center' }}>
        {t('read.snoozeDescription', { count: SNOOZE_DAYS })}
      </Text>
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
        <View style={{ flex: 1 }}>
          <Button label={t('read.snoozeAccept')} onPress={onAccept} />
        </View>
        <View style={{ flex: 1 }}>
          <Button label={t('read.snoozeDismiss')} variant="secondary" onPress={onDismiss} />
        </View>
      </View>
    </BottomSheet>
  );
}
