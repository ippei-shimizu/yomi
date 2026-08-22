import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { fontFamilies, typography, type TextScript, type TextVariant } from '@/design/tokens';

import { useDefaultScript } from './scriptContext';

export type TextProps = RNTextProps & {
  variant?: TextVariant;
  /**
   * 使う書体。
   *
   * React Native は fontFamily を 1 つしか指定できず、CSS のような
   * 複数フォントのフォールバックができない。そのため呼び出し側が選ぶ。
   *
   * - 省略時: 表示言語に従う（日本語なら Zen Kaku Gothic New、英語なら Outfit）
   * - `latin`: Outfit。**言語によらず英数で出すもの**（件数、日付、パーセント、記号）。
   *   数字は Outfit のままにし、Zen Kaku に混ぜない
   * - `ja`: Zen Kaku Gothic New を明示する
   */
  script?: TextScript;
};

/**
 * 書体とサイズをデザイントークンに固定した Text。
 * 画面側で fontSize / fontFamily を直接指定しない。
 */
export function Text({ variant = 'body', script, style, ...rest }: TextProps) {
  const defaultScript = useDefaultScript();

  return (
    <RNText
      style={[
        typography[variant],
        { fontFamily: fontFamilies[script ?? defaultScript][variant] },
        style,
      ]}
      {...rest}
    />
  );
}
