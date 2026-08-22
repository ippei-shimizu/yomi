import { router } from 'expo-router';
import { View } from 'react-native';

import { colors, radius } from '@/design/tokens';
import { OnboardingLayout } from '@/features/onboarding/OnboardingLayout';
import { useOnboardingCompleted } from '@/features/settings/useSettings';
import { Card, Text, useThemeColors } from '@/ui';

/**
 * Onboarding 2/3 共有シートへの追加手順。
 * Settings の「共有シートの設定方法」からも単体で開く。
 */
const STEPS = [
  'Safari や X で共有ボタンを押す',
  '一覧を右にスクロールして「その他」を押す',
  '「Yomi」をオンにして、上の方へドラッグする',
];

export default function OnboardingShareScreen() {
  const theme = useThemeColors();
  const [completed] = useOnboardingCompleted();

  // Settings から開いた場合は「次へ」ではなく「閉じる」にする
  const isStandalone = completed;

  return (
    <OnboardingLayout
      step={2}
      primaryLabel={isStandalone ? '閉じる' : '次へ'}
      onPrimary={() => (isStandalone ? router.back() : router.push('/onboarding/notify'))}
      onSkip={isStandalone ? undefined : () => router.replace('/(tabs)')}
    >
      <View style={{ flex: 1, justifyContent: 'center', gap: 28 }}>
        <Text variant="display" style={{ color: theme.ink }}>
          共有シートに追加
        </Text>

        <View style={{ gap: 12 }}>
          {STEPS.map((step, index) => (
            <Card key={step}>
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
                  {step}
                </Text>
              </View>
            </Card>
          ))}
        </View>

        <Text variant="caption" style={{ color: theme['ink-2'] }}>
          一度追加すれば、次からは共有ボタンから 2 タップで保存できます。
        </Text>
      </View>
    </OnboardingLayout>
  );
}
