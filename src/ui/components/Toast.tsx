import { View } from 'react-native';

import { Text } from '../Text';
import { useThemeColors } from '../theme';
import { colors, radius } from '../tokens';

/**
 * トースト（docs/DesignGuideline.md §8）。
 * ink 塗りの pill、白文字、左に ok のチェック。
 */
export function Toast({ message }: { message: string }) {
  const theme = useThemeColors();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        alignSelf: 'center',
        backgroundColor: theme.ink,
        borderRadius: radius.pill,
        paddingHorizontal: 16,
        paddingVertical: 12,
      }}
    >
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: radius.pill,
          backgroundColor: colors.status.ok,
        }}
      />
      <Text variant="body" style={{ color: theme.surface }}>
        {message}
      </Text>
    </View>
  );
}
