import type { ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';

import { cardShadow, radius } from '@/design/tokens';

import { useThemeColors } from '../theme';

export type CardProps = ViewProps & {
  children?: ReactNode;
  /** 大カード（Today's Pick、Stats の数値カード）は 28 */
  size?: 'default' | 'large';
  /**
   * 塗り色。指定すると色カードになる。
   * **色カードには影を付けない**（浮きすぎるため）。
   */
  backgroundColor?: string;
};

/**
 * カード。
 *
 * 影と角丸のクリッピングを 2 枚の View に分ける。iOS では
 * `overflow: 'hidden'`（= clipsToBounds）が**影ごと切り落とす**ため、
 * 1 枚に両方を載せると白カードの影が一切出ない。
 *
 * 塗りは外側に置く。iOS の影はレイヤーの不透明部分から作られるので、
 * 背景が透明な View に影だけ指定しても何も描かれない。
 */
export function Card({ children, size = 'default', backgroundColor, style, ...rest }: CardProps) {
  const theme = useThemeColors();
  const isColored = backgroundColor !== undefined;
  const borderRadius = size === 'large' ? radius.cardLg : radius.card;

  return (
    <View
      style={[
        { borderRadius, backgroundColor: backgroundColor ?? theme.surface },
        isColored ? null : cardShadow,
        style,
      ]}
      {...rest}
    >
      {/* 角の外へはみ出す子（画像・塗り）を丸く切る。
          flex は付けない。高さが中身任せのカードでは 0 に潰れる */}
      <View style={{ borderRadius, overflow: 'hidden' }}>{children}</View>
    </View>
  );
}
