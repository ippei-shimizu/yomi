import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { Text, type TextProps } from '../Text';
import { useThemeColors } from '../theme';

/**
 * 画面上部の戻る導線。ナビバーを使わず、各画面がコンテンツ先頭に置く。
 *
 * 見出しの大きさは画面ごとに違う（一覧は display、下層は heading）ので
 * variant で受ける。タイトルを省くと戻るボタンと trailing だけの行になる。
 */
export function ScreenHeader({
  title,
  titleVariant = 'display',
  trailing,
  onBack,
}: {
  title?: string;
  titleVariant?: TextProps['variant'];
  trailing?: ReactNode;
  onBack: () => void;
}) {
  const theme = useThemeColors();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="戻る" onPress={onBack} hitSlop={8}>
        <Text variant="heading" script="latin" style={{ color: theme.ink }}>
          ←
        </Text>
      </Pressable>
      <View style={{ flex: 1 }}>
        {title === undefined ? null : (
          <Text variant={titleVariant} style={{ color: theme.ink }}>
            {title}
          </Text>
        )}
      </View>
      {trailing}
    </View>
  );
}
