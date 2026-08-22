import type { ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';

import { cardShadow, radius } from '@/design/tokens';
import { useThemeColors } from '../theme';

export type CardProps = ViewProps & {
  children?: ReactNode;
  /** 大カード（Today's Pick、Stats の数値カード）は 28（§3） */
  size?: 'default' | 'large';
  /**
   * 塗り色。指定すると色カードになる。
   * **色カードには影を付けない**（§9: 浮きすぎるため）。
   */
  backgroundColor?: string;
};

export function Card({ children, size = 'default', backgroundColor, style, ...rest }: CardProps) {
  const theme = useThemeColors();
  const isColored = backgroundColor !== undefined;

  return (
    <View
      style={[
        {
          borderRadius: size === 'large' ? radius.cardLg : radius.card,
          backgroundColor: backgroundColor ?? theme.surface,
          overflow: 'hidden',
        },
        isColored ? null : cardShadow,
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}
