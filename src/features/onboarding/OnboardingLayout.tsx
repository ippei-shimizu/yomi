import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, layout, radius } from '@/design/tokens';
import { Button, Text, useThemeColors } from '@/ui';

export const ONBOARDING_STEPS = 3;

/**
 * Onboarding の共通レイアウト。
 * 3 画面固定・スキップ可。
 */
export function OnboardingLayout({
  step,
  children,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  onSkip,
}: {
  step: number;
  children: ReactNode;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  onSkip?: () => void;
}) {
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.bg,
        paddingHorizontal: layout.screenPadding,
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 24,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {Array.from({ length: ONBOARDING_STEPS }, (_, index) => (
            <View
              key={index}
              style={{
                width: index + 1 === step ? 20 : 6,
                height: 6,
                borderRadius: radius.pill,
                backgroundColor: index + 1 === step ? colors.brand.brand : theme['ink-3'],
              }}
            />
          ))}
        </View>
        {onSkip === undefined ? null : (
          <Pressable accessibilityRole="button" onPress={onSkip} hitSlop={8}>
            <Text variant="caption" style={{ color: theme['ink-2'] }}>
              スキップ
            </Text>
          </Pressable>
        )}
      </View>

      {children}

      <View style={{ gap: 12 }}>
        <Button label={primaryLabel} onPress={onPrimary} />
        {secondaryLabel === undefined || onSecondary === undefined ? null : (
          <Button label={secondaryLabel} variant="secondary" onPress={onSecondary} />
        )}
      </View>
    </View>
  );
}
