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
import { Text, useThemeColors, useTranslation } from '@/ui';

const TIME_CHOICES = ['07:00', '08:00', '09:00', '21:00'];

/** Onboarding 3/3 通知時刻 + 権限 */
export default function OnboardingNotifyScreen() {
  const theme = useThemeColors();
  const t = useTranslation();
  const [time, setTime] = useNotificationTimesSetting();
  const [, setCompleted] = useOnboardingCompleted();
  const [busy, setBusy] = useState(false);

  const finish = () => {
    setCompleted(true);
    router.replace('/(tabs)');
  };

  const allowAndFinish = async () => {
    setBusy(true);
    // 拒否されても先に進む
    await requestPermission().catch(() => false);
    setBusy(false);
    finish();
  };

  return (
    <OnboardingLayout
      step={3}
      primaryLabel={t(busy ? 'onboarding.notifyChecking' : 'onboarding.notifyAllow')}
      onPrimary={() => void allowAndFinish()}
      secondaryLabel={t('onboarding.notifyLater')}
      onSecondary={finish}
    >
      <View style={{ flex: 1, justifyContent: 'center', gap: 28 }}>
        <View style={{ gap: 12 }}>
          <Text variant="display" style={{ color: theme.ink }}>
            {t('onboarding.notifyTitle')}
          </Text>
          <Text variant="body" style={{ color: theme['ink-2'] }}>
            {t('onboarding.notifyBody')}
          </Text>
        </View>

        <View style={{ gap: layout.cardGap / 2 }}>
          {TIME_CHOICES.map((choice) => (
            <SettingsRow
              key={choice}
              label={choice}
              value={time === choice ? t('onboarding.notifyEnabled') : undefined}
              onPress={() => setTime(choice)}
            />
          ))}
        </View>
      </View>
    </OnboardingLayout>
  );
}
