import { View } from 'react-native';

import type { statsRepo } from '@/db/repositories';
import { formatRate } from '@/features/stats/format';
import { Text, useThemeColors } from '@/ui';

/**
 * ソース別の読了率一覧。分子/分母も併記する。
 *
 * 率だけだと 1/1 の 100% と 40/50 の 80% が同じ重みに見えてしまう。
 */
export function SourceReadRateList({ rows }: { rows: readonly statsRepo.SourceReadRate[] }) {
  const theme = useThemeColors();

  return (
    <View style={{ padding: 16, gap: 10 }}>
      {rows.map((row) => (
        <View key={row.source} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text variant="caption" style={{ flex: 1, color: theme.ink }}>
            {row.source}
          </Text>
          <Text variant="caption" script="latin" style={{ color: theme['ink-2'] }}>
            {row.read} / {row.total}
          </Text>
          <Text
            variant="body"
            script="latin"
            style={{ color: theme.ink, minWidth: 48, textAlign: 'right' }}
          >
            {formatRate(row.readRate)}
          </Text>
        </View>
      ))}
    </View>
  );
}
