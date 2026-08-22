import { View } from 'react-native';

import { Text } from '../Text';
import { useThemeColors } from '../theme';

/**
 * 画面いっぱいに 1 行だけ出す。起動に失敗した時など、
 * ナビゲーションもタブも出せない状況で使う。
 */
export function FullScreenMessage({ message }: { message: string }) {
  const theme = useThemeColors();

  return (
    <View
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bg }}
    >
      <Text variant="body" style={{ color: theme.ink }}>
        {message}
      </Text>
    </View>
  );
}
