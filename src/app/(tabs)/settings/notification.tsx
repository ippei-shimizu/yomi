import { router } from 'expo-router';
import { Alert, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { layout } from '@/design/tokens';
import { useEntitlement } from '@/domain/entitlement';
import {
  formatTimeOfDay,
  parseTimeList,
  parseTimeOfDay,
  type TimeOfDay,
} from '@/domain/notification';
import { SettingsRow, SettingsSection } from '@/features/settings/SettingsRow';
import { useNotificationTimesSetting } from '@/features/settings/useSettings';
import { Button, ScreenHeader, Text, useThemeColors, useTranslation } from '@/ui';

/** 選べる時刻。専用ピッカーを入れずに済ませる */
const TIME_CHOICES = ['06:00', '07:00', '08:00', '09:00', '12:00', '18:00', '21:00', '22:00'];

export default function NotificationSettingsScreen() {
  const theme = useThemeColors();
  const t = useTranslation();
  const insets = useSafeAreaInsets();
  const { limits } = useEntitlement();

  const [raw, setRaw] = useNotificationTimesSetting();
  const times = parseTimeList(raw);

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
        Alert.alert(t('notification.atLeastOne'));
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
      <ScreenHeader title={t('notification.title')} onBack={() => router.back()} />

      <Text variant="caption" style={{ color: theme['ink-2'] }}>
        {t(
          limits.multipleNotificationTimes
            ? 'notification.multipleAllowed'
            : 'notification.singleOnly',
        )}
      </Text>

      <SettingsSection title={t('notification.sectionTimes')}>
        {TIME_CHOICES.map((choice) => (
          <SettingsRow
            key={choice}
            label={choice}
            value={
              times.some((time) => formatTimeOfDay(time) === choice)
                ? t('notification.enabled')
                : undefined
            }
            onPress={() => toggleTime(choice)}
          />
        ))}
      </SettingsSection>

      {limits.multipleNotificationTimes ? null : (
        <Button
          label={t('notification.upgradeForMultiple')}
          variant="secondary"
          onPress={() => router.push({ pathname: '/paywall', params: { trigger: 'settings' } })}
        />
      )}
    </ScrollView>
  );
}
