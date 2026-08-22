import type { ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { layout, radius } from '@/design/tokens';

import { notchedPath } from './notchedPath';

/**
 * 右辺に丸い切り欠きを持つカード。
 *
 * **Yomi 内で Today's Pick にだけ使う。1 画面に 1 つだけ**。
 * 切り欠きの内側に白い丸ボタンを置くため、背景を SVG の Path で描いて
 * その部分をくり抜く。
 */
export type NotchedCardProps = {
  width: number;
  height: number;
  backgroundColor: string;
  /** 切り欠きの中心 Y。既定はカードの中央 */
  notchCenterY?: number;
  children?: ReactNode;
};

export function NotchedCard({
  width,
  height,
  backgroundColor,
  notchCenterY,
  children,
}: NotchedCardProps) {
  const centerY = notchCenterY ?? height / 2;
  const path = notchedPath(width, height, radius.cardLg, layout.notchRadius, centerY);

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height} style={{ position: 'absolute' }}>
        <Path d={path} fill={backgroundColor} />
      </Svg>
      {children}
    </View>
  );
}
