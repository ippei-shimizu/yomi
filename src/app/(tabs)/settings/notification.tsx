import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { layout } from '@/design/tokens';
import { useEntitlement } from '@/domain/entitlement';
import { formatTimeOfDay, parseTimeOfDay, type TimeOfDay } from '@/domain/notification';
import { SettingsRow, SettingsSection } from '@/features/settings/SettingsRow';
import { useNotificationTimesSetting } from '@/features/settings/useSettings';
import { Button, Text, useThemeColors } from '@/ui';

/** 選べる時刻。専用ピッカーを入れずに済ませる */
const TIME_CHOICES = ['06:00', '07:00', '08:00', '09:00', '12:00', '18:00', '21:00', '22:00'];

export default function NotificationSettingsScreen() {
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const { limits } = useEntitlement();

  const [raw, setRaw] = useNotificationTimesSetting();
  const times = parseTimes(raw);

  const commit = (next: TimeOfDay[]) => {
    // 空にはできない。0 件だと通知が止まり、原因が分からなくなる
    if (next.length === 0) return;
    setRaw(next.map(formatTimeOfDay).sort().join(','));
  };

  const toggleTime = (value: string) => {
    const parsed = parseTimeOfDay(value);
    if (!parsed) return;

    const exists = times.some((time) => formatTimeOfDay(time) === value);
    if (exists) {
      if (times.length === 1) {
        Alert.alert('通知時刻は 1 つ以上必要です');
        return;
      }
      commit(times.filter((time) => formatTimeOfDay(time) !== value));
      return;
    }

    // 無料プランは 1 つだけ
    if (!limits.multipleNotificationTimes) {
      commit([parsed]);
      return;
    }
    commit([...times, parsed]);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{
        paddingHorizontal: layout.screenPadding,
        paddingTop: insets.top + 8,
        paddingBottom: 48,
        gap: layout.sectionGap,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="戻る"
          onPress={() => router.back()}
          hitSlop={8}
        >
          <Text variant="heading" script="latin" style={{ color: theme.ink }}>
            ←
          </Text>
        </Pressable>
        <Text variant="display" style={{ color: theme.ink }}>
          今日の 1 本
        </Text>
      </View>

      <Text variant="caption" style={{ color: theme['ink-2'] }}>
        {limits.multipleNotificationTimes
          ? '複数の時刻を設定できます'
          : '無料プランで設定できる時刻は 1 つです'}
      </Text>

      <SettingsSection title="時刻">
        {TIME_CHOICES.map((choice) => (
          <SettingsRow
            key={choice}
            label={choice}
            value={times.some((time) => formatTimeOfDay(time) === choice) ? '設定中' : undefined}
            onPress={() => toggleTime(choice)}
          />
        ))}
      </SettingsSection>

      {limits.multipleNotificationTimes ? null : (
        <Button
          label="複数の時刻を設定する"
          variant="secondary"
          onPress={() => router.push({ pathname: '/paywall', params: { trigger: 'settings' } })}
        />
      )}
    </ScrollView>
  );
}

function parseTimes(raw: string): TimeOfDay[] {
  const parsed = raw
    .split(',')
    .map((value) => parseTimeOfDay(value))
    .filter((time): time is TimeOfDay => time !== null);

  // 壊れていても通知が止まらないよう既定値に倒す
  return parsed.length > 0 ? parsed : [{ hour: 8, minute: 0 }];
}
