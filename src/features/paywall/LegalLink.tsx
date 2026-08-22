import { Pressable } from 'react-native';

import { Text, useThemeColors } from '@/ui';

/**
 * 規約・プライバシーポリシーへのリンク。審査要件で購入画面に必ず出す。
 *
 * 外部ブラウザではなくアプリ内の画面へ遷移する。購入画面はモーダルなので、
 * ブラウザに飛ばすと購入の流れが途切れる。
 */
export function LegalLink({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useThemeColors();

  return (
    <Pressable accessibilityRole="link" onPress={onPress}>
      <Text variant="caption" style={{ color: theme['ink-2'], textDecorationLine: 'underline' }}>
        {label}
      </Text>
    </Pressable>
  );
}
