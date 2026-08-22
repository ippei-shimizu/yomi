import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Text } from '../Text';
import { useThemeColors } from '../theme';
import { layout } from '@/design/tokens';

/**
 * 空状態。**次の行動を示す**。
 * 「データがありません」で終わらせない。
 */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  const theme = useThemeColors();

  return (
    <View style={{ alignItems: 'center', paddingVertical: 48, gap: layout.cardGap }}>
      <Text variant="heading" style={{ color: theme.ink, textAlign: 'center' }}>
        {title}
      </Text>
      {description === undefined ? null : (
        <Text variant="caption" style={{ color: theme['ink-2'], textAlign: 'center' }}>
          {description}
        </Text>
      )}
      {action}
    </View>
  );
}
