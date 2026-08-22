import { View } from 'react-native';

import { colors } from '@/design/tokens';
import { PRO_BENEFIT_KEYS } from '@/features/paywall/copy';
import { Text, useThemeColors, useTranslation } from '@/ui';

/** Pro で何ができるようになるかの箇条書き */
export function ProBenefitList() {
  const theme = useThemeColors();
  const t = useTranslation();

  return (
    <View style={{ gap: 12 }}>
      {PRO_BENEFIT_KEYS.map((key) => (
        <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text variant="body" script="latin" style={{ color: colors.status.ok }}>
            ✓
          </Text>
          <Text variant="body" style={{ flex: 1, color: theme.ink }}>
            {t(key)}
          </Text>
        </View>
      ))}
    </View>
  );
}
