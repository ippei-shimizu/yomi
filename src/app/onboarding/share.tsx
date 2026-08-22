import { router } from 'expo-router';
import { View } from 'react-native';

import { colors, radius } from '@/design/tokens';
import { OnboardingLayout } from '@/features/onboarding/OnboardingLayout';
import { useOnboardingCompleted } from '@/features/settings/useSettings';
import type { MessageKey } from '@/lib/i18n';
import { Card, Text, useThemeColors, useTranslation } from '@/ui';

/**
 * Onboarding 2/3 共有シートへの追加手順。
 * Settings の「共有シートの設定方法」からも単体で開く。
 */
const STEP_KEYS = [
  'onboarding.shareStep1',
  'onboarding.shareStep2',
  'onboarding.shareStep3',
] as const satisfies readonly MessageKey[];

export default function OnboardingShareScreen() {
  const theme = useThemeColors();
  const t = useTranslation();
  const [completed] = useOnboardingCompleted();

  // Settings から開いた場合は「次へ」ではなく「閉じる」にする
  const isStandalone = completed;

  return (
    <OnboardingLayout
      step={2}
      primaryLabel={t(isStandalone ? 'common.close' : 'common.next')}
      onPrimary={() => (isStandalone ? router.back() : router.push('/onboarding/notify'))}
      onSkip={isStandalone ? undefined : () => router.replace('/(tabs)')}
    >
      <View style={{ flex: 1, justifyContent: 'center', gap: 28 }}>
        <Text variant="display" style={{ color: theme.ink }}>
          {t('onboarding.shareTitle')}
        </Text>

        <View style={{ gap: 12 }}>
          {STEP_KEYS.map((stepKey, index) => (
            <Card key={stepKey}>
              <View
                style={{ flexDirection: 'row', gap: 12, padding: 16, alignItems: 'flex-start' }}
              >
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: radius.pill,
                    backgroundColor: colors.brand.brand,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    variant="caption"
                    script="latin"
                    style={{ color: '#FFFFFF', lineHeight: 13 }}
                  >
                    {index + 1}
                  </Text>
                </View>
                <Text variant="body" style={{ flex: 1, color: theme.ink }}>
                  {t(stepKey)}
                </Text>
              </View>
            </Card>
          ))}
        </View>

        <Text variant="caption" style={{ color: theme['ink-2'] }}>
          {t('onboarding.shareFooter')}
        </Text>
      </View>
    </OnboardingLayout>
  );
}
