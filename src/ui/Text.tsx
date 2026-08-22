import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { fontFamilies, typography, type TextVariant } from '@/design/tokens';

export type TextScript = 'ja' | 'latin';

export type TextProps = RNTextProps & {
  variant?: TextVariant;
  /**
   * 使う書体。
   *
   * React Native は fontFamily を 1 つしか指定できず、CSS のような
   * 複数フォントのフォールバックができない。そのため呼び出し側が選ぶ。
   *
   * - `ja`（既定）: Zen Kaku Gothic New。和文を含むテキスト
   * - `latin`: Outfit。**数字と英数のみのテキスト**（件数、日付、パーセント）。
   *   数字は Outfit のままにし、Zen Kaku に混ぜない
   */
  script?: TextScript;
};

/**
 * 書体とサイズをデザイントークンに固定した Text。
 * 画面側で fontSize / fontFamily を直接指定しない。
 */
export function Text({ variant = 'body', script = 'ja', style, ...rest }: TextProps) {
  return (
    <RNText
      style={[typography[variant], { fontFamily: fontFamilies[script][variant] }, style]}
      {...rest}
    />
  );
}
