import { View } from 'react-native';

import type { statsRepo } from '@/db/repositories';
import { colors, radius } from '@/design/tokens';
import { formatWeekTick, weekBars } from '@/features/stats/format';
import { Text, useThemeColors } from '@/ui';

const CHART_HEIGHT = 96;

/**
 * 保存（薄）/ 読了（濃）の棒グラフ。読了の棒は保存の棒の中に重ねて描く。
 *
 * 目盛りは 1 週おきにだけ出す。8 週ぶん並べると文字が潰れて読めない。
 */
export function WeeklyChart({ weeks }: { weeks: readonly statsRepo.WeeklySummary[] }) {
  const theme = useThemeColors();
  const bars = weekBars(weeks, CHART_HEIGHT);

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: CHART_HEIGHT, gap: 6 }}>
        {weeks.map((week, index) => (
          <View key={week.weekStart.toISOString()} style={{ flex: 1, justifyContent: 'flex-end' }}>
            <View
              style={{
                // 0 件の週も存在が分かるよう最低 2pt は描く
                height: Math.max(2, bars[index]?.savedHeight ?? 0),
                borderRadius: radius.icon,
                backgroundColor: colors.brand['brand-soft'],
                justifyContent: 'flex-end',
              }}
            >
              <View
                style={{
                  height: bars[index]?.readHeight ?? 0,
                  borderRadius: radius.icon,
                  backgroundColor: colors.brand.brand,
                }}
              />
            </View>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {weeks.map((week, index) => (
          <Text
            key={week.weekStart.toISOString()}
            variant="caption"
            script="latin"
            numberOfLines={1}
            style={{ flex: 1, color: theme['ink-3'], fontSize: 9, textAlign: 'center' }}
          >
            {index % 2 === 0 ? formatWeekTick(week.weekStart) : ''}
          </Text>
        ))}
      </View>
    </View>
  );
}
