import { useQuery } from '@tanstack/react-query';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDatabase } from '@/db/DatabaseProvider';
import { queryKeys } from '@/db/queryKeys';
import { statsRepo } from '@/db/repositories';
import { colors, layout } from '@/design/tokens';
import {
  formatAverageDays,
  formatDelta,
  formatRate,
  formatRateDelta,
  formatWeekRange,
} from '@/features/stats/format';
import { SourceReadRateList } from '@/features/stats/SourceReadRateList';
import { StatCard } from '@/features/stats/StatCard';
import { WeeklyChart } from '@/features/stats/WeeklyChart';
import { Card, SectionHeader, Text, useThemeColors } from '@/ui';

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
            <SourceReadRateList rows={bySource} />
          </Card>
        </View>
      )}
    </ScrollView>
  );
}
