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
import { Card, SectionHeader, Text, useThemeColors, useTranslation } from '@/ui';

export default function StatsScreen() {
  const theme = useThemeColors();
  const t = useTranslation();
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
        {t('stats.title')}
      </Text>

      <View style={{ gap: layout.cardGap }}>
        <SectionHeader
          title={t('stats.thisWeek', { range: formatWeekRange(thisWeek.weekStart) })}
        />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <StatCard
            label={t('stats.saved')}
            value={String(thisWeek.saved)}
            delta={formatDelta(thisWeek.saved, lastWeek.saved)}
            color={colors.source['src-amber']}
          />
          <StatCard
            label={t('stats.read')}
            value={String(thisWeek.read)}
            delta={formatDelta(thisWeek.read, lastWeek.read)}
            color={colors.source['src-green']}
          />
          <StatCard
            label={t('stats.readRate')}
            value={formatRate(t, thisWeek.readRate)}
            delta={formatRateDelta(thisWeek.readRate, lastWeek.readRate)}
            color={colors.brand.brand}
          />
        </View>
      </View>

      <View style={{ gap: layout.cardGap }}>
        <SectionHeader title={t('stats.recentWeeks')} />
        <Card>
          <View style={{ padding: 16, gap: 8 }}>
            <WeeklyChart weeks={recentWeeks} />
          </View>
        </Card>
      </View>

      <View style={{ gap: layout.cardGap }}>
        <SectionHeader title={t('stats.current')} />
        <Card>
          <View style={{ padding: 16, gap: 6 }}>
            <Text variant="body" style={{ color: theme.ink }}>
              {t('stats.currentSummary', { unread: current.unread, stale: current.stale })}
            </Text>
            <Text variant="caption" style={{ color: theme['ink-2'] }}>
              {t('stats.averageDaysToRead', {
                value: formatAverageDays(t, current.averageDaysToRead),
              })}
            </Text>
          </View>
        </Card>
      </View>

      {bySource.length === 0 ? null : (
        <View style={{ gap: layout.cardGap }}>
          <SectionHeader title={t('stats.bySource')} />
          <Card>
            <SourceReadRateList rows={bySource} />
          </Card>
        </View>
      )}
    </ScrollView>
  );
}
