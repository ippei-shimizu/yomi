import { View } from 'react-native';

import { colors } from '@/design/tokens';
import { PRO_BENEFITS } from '@/features/paywall/copy';
import { Text, useThemeColors } from '@/ui';

/** Pro で何ができるようになるかの箇条書き */
export function ProBenefitList() {
  const theme = useThemeColors();

  return (
    <View style={{ gap: 12 }}>
      {PRO_BENEFITS.map((benefit) => (
        <View key={benefit} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text variant="body" script="latin" style={{ color: colors.status.ok }}>
            ✓
          </Text>
          <Text variant="body" style={{ color: theme.ink }}>
            {benefit}
          </Text>
        </View>
      ))}
    </View>
  );
}
