import { Linking, Pressable } from 'react-native';

import { Text, useThemeColors } from '@/ui';

/** 規約・プライバシーポリシーへの外部リンク。審査要件で必ず出す */
export function LegalLink({ label, url }: { label: string; url: string }) {
  const theme = useThemeColors();

  return (
    <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(url)}>
      <Text variant="caption" style={{ color: theme['ink-2'], textDecorationLine: 'underline' }}>
        {label}
      </Text>
    </Pressable>
  );
}
