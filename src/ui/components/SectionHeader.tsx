import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Text } from '../Text';
import { useThemeColors } from '../theme';

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  const theme = useThemeColors();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Text variant="heading" style={{ color: theme.ink }}>
        {title}
      </Text>
      {action}
    </View>
  );
}
