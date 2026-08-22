import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { layout } from '@/design/tokens';
import { requestPermission } from '@/domain/notification';
import { OnboardingLayout } from '@/features/onboarding/OnboardingLayout';
import { SettingsRow } from '@/features/settings/SettingsRow';
import {
  useNotificationTimesSetting,
  useOnboardingCompleted,
} from '@/features/settings/useSettings';
import { Text, useThemeColors } from '@/ui';

const TIME_CHOICES = ['07:00', '08:00', '09:00', '21:00'];

/** S01 3/3 通知時刻 + 権限（docs/Screens.md S01） */
export default function OnboardingNotifyScreen() {
  const theme = useThemeColors();
  const [time, setTime] = useNotificationTimesSetting();
  const [, setCompleted] = useOnboardingCompleted();
  const [busy, setBusy] = useState(false);

  const finish = () => {
    setCompleted(true);
    router.replace('/(tabs)');
  };

  const allowAndFinish = async () => {
    setBusy(true);
    // 拒否されても先に進む（docs/Screens.md S01）
    await requestPermission().catch(() => false);
    setBusy(false);
    finish();
  };

  return (
    <OnboardingLayout
      step={3}
      primaryLabel={busy ? '確認中' : '通知を許可して始める'}
      onPrimary={() => void allowAndFinish()}
      secondaryLabel="あとで設定する"
      onSecondary={finish}
    >
      <View style={{ flex: 1, justifyContent: 'center', gap: 28 }}>
        <View style={{ gap: 12 }}>
          <Text variant="display" style={{ color: theme.ink }}>
            毎朝 1 本だけ{'\n'}お知らせします
          </Text>
          <Text variant="body" style={{ color: theme['ink-2'] }}>
            未読の中から 1 件だけ選んで通知します。溜まっていても、その日に読むのは 1 本です。
          </Text>
        </View>

        <View style={{ gap: layout.cardGap / 2 }}>
          {TIME_CHOICES.map((choice) => (
            <SettingsRow
              key={choice}
              label={choice}
              value={time === choice ? '設定中' : undefined}
              onPress={() => setTime(choice)}
            />
          ))}
        </View>
      </View>
    </OnboardingLayout>
  );
}
