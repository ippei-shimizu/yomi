import { View } from 'react-native';

import { BottomSheet, Button, Text, useThemeColors, useTranslation } from '@/ui';

/** 読了確認シート。ボタンは動詞にする */
export function ReadConfirmSheet({
  visible,
  onRead,
  onNotYet,
}: {
  visible: boolean;
  onRead: () => void;
  onNotYet: () => void;
}) {
  const theme = useThemeColors();
  const t = useTranslation();

  return (
    // 誤って背景タップで閉じると読了記録の機会を失うので閉じさせない
    <BottomSheet visible={visible} onRequestClose={onNotYet} dismissOnBackdropPress={false}>
      <Text variant="heading" style={{ color: theme.ink, textAlign: 'center', paddingVertical: 8 }}>
        {t('read.confirmTitle')}
      </Text>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 2 }}>
          <Button label={t('read.confirmYes')} onPress={onRead} />
        </View>
        <View style={{ flex: 1 }}>
          <Button label={t('read.confirmNo')} variant="secondary" onPress={onNotYet} />
        </View>
      </View>
    </BottomSheet>
  );
}
