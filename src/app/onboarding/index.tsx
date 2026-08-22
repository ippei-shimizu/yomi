import { router } from 'expo-router';
import { View } from 'react-native';

import { OnboardingLayout } from '@/features/onboarding/OnboardingLayout';
import { colors, radius } from '@/design/tokens';
import { Text, useThemeColors, useTranslation } from '@/ui';

/** Onboarding 1/3 コンセプト */
export default function OnboardingConceptScreen() {
  const theme = useThemeColors();
  const t = useTranslation();

  return (
    <OnboardingLayout
      step={1}
      primaryLabel={t('common.next')}
      onPrimary={() => router.push('/onboarding/share')}
      onSkip={() => router.replace('/(tabs)')}
    >
      <View style={{ flex: 1, justifyContent: 'center', gap: 32 }}>
        {/* イラストの代わりに、ソースカラーのカードを重ねて「溜まっている」を表す */}
        <View style={{ height: 180, justifyContent: 'center' }}>
          {[colors.source['src-amber'], colors.source['src-coral'], colors.brand.brand].map(
            (color, index) => (
              <View
                key={color}
                style={{
                  position: 'absolute',
                  left: index * 16,
                  top: index * 22,
                  right: 40 - index * 16,
                  height: 96,
                  borderRadius: radius.cardLg,
                  backgroundColor: color,
                  opacity: 1 - index * 0.15,
                }}
              />
            ),
          )}
        </View>

        <View style={{ gap: 12 }}>
          <Text variant="display" style={{ color: theme.ink }}>
            {t('onboarding.introTitle')}
          </Text>
          <Text variant="body" style={{ color: theme['ink-2'] }}>
            {t('onboarding.introBody')}
          </Text>
        </View>
      </View>
    </OnboardingLayout>
  );
}
