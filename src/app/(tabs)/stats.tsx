import { useQuery } from '@tanstack/react-query';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDatabase } from '@/db/DatabaseProvider';
import { queryKeys } from '@/db/queryKeys';
import { statsRepo } from '@/db/repositories';
import { colors, layout, radius } from '@/design/tokens';
import {
  formatAverageDays,
  formatDelta,
  formatRate,
  formatRateDelta,
  formatWeekRange,
  formatWeekTick,
  weekBars,
} from '@/features/stats/format';
import { Card, SectionHeader, Text, useThemeColors } from '@/ui';

const CHART_HEIGHT = 96;

/** S09 Stats（docs/Screens.md S09） */
export default function StatsScreen() {
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const db = useDatabase();

  const stats = useQuery({
    queryKey: queryKeys.stats,
    queryFn: () => ({
      thisWeek: statsRepo.thisWeek(db),
      lastWeek: statsRepo.lastWeek(db),
      recentWeeks: statsRepo.recentWeeks(db),
      current: statsRepo.currentStatus(db),
      bySource: statsRepo.readRateBySource(db),
    }),
  });

  if (!stats.data) return <View style={{ flex: 1, backgroundColor: theme.bg }} />;

  const { thisWeek, lastWeek, recentWeeks, current, bySource } = stats.data;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{
        paddingHorizontal: layout.screenPadding,
        paddingTop: insets.top + 8,
        paddingBottom: layout.listBottomInset,
        gap: layout.sectionGap,
      }}
    >
      <Text variant="display" style={{ color: theme.ink }}>
        Stats
      </Text>

      <View style={{ gap: layout.cardGap }}>
        <SectionHeader title={`今週（${formatWeekRange(thisWeek.weekStart)}）`} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <StatCard
            label="保存"
            value={String(thisWeek.saved)}
            delta={formatDelta(thisWeek.saved, lastWeek.saved)}
            color={colors.source['src-amber']}
          />
          <StatCard
            label="読了"
            value={String(thisWeek.read)}
            delta={formatDelta(thisWeek.read, lastWeek.read)}
            color={colors.source['src-green']}
          />
          <StatCard
            label="読了率"
            value={formatRate(thisWeek.readRate)}
            delta={formatRateDelta(thisWeek.readRate, lastWeek.readRate)}
            color={colors.brand.brand}
          />
        </View>
      </View>

      <View style={{ gap: layout.cardGap }}>
        <SectionHeader title="直近 8 週" />
        <Card>
          <View style={{ padding: 16, gap: 8 }}>
            <WeeklyChart weeks={recentWeeks} />
          </View>
        </Card>
      </View>

      <View style={{ gap: layout.cardGap }}>
        <SectionHeader title="現在" />
        <Card>
          <View style={{ padding: 16, gap: 6 }}>
            <Text variant="body" style={{ color: theme.ink }}>
              未読 {current.unread} 件 · 30 日超 {current.stale} 件
            </Text>
            <Text variant="caption" style={{ color: theme['ink-2'] }}>
              平均 読むまで {formatAverageDays(current.averageDaysToRead)}
            </Text>
          </View>
        </Card>
      </View>

      {bySource.length === 0 ? null : (
        <View style={{ gap: layout.cardGap }}>
          <SectionHeader title="ソース別 読了率" />
          <Card>
            <View style={{ padding: 16, gap: 10 }}>
              {bySource.map((row) => (
                <View
                  key={row.source}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                >
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
          </Card>
        </View>
      )}
    </ScrollView>
  );
}

function StatCard({
  label,
  value,
  delta,
  color,
}: {
  label: string;
  value: string;
  delta: string;
  color: string;
}) {
  return (
    <View style={{ flex: 1 }}>
      <Card size="large" backgroundColor={color}>
        <View style={{ padding: 16, gap: 4, minHeight: 96, justifyContent: 'space-between' }}>
          <Text variant="caption" style={{ color: '#FFFFFF', opacity: 0.85 }}>
            {label}
          </Text>
          {/* 数字は Outfit（docs/DesignGuideline.md §4） */}
          <Text variant="display" script="latin" style={{ color: '#FFFFFF' }}>
            {value}
          </Text>
          <Text variant="caption" script="latin" style={{ color: '#FFFFFF', opacity: 0.85 }}>
            {delta}
          </Text>
        </View>
      </Card>
    </View>
  );
}

/** 保存（薄）/ 読了（濃）の棒グラフ（docs/Screens.md S09） */
function WeeklyChart({ weeks }: { weeks: { weekStart: Date; saved: number; read: number }[] }) {
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
