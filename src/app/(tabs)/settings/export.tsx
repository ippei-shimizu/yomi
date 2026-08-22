import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDatabase } from '@/db/DatabaseProvider';
import { layout } from '@/design/tokens';
import { buildJson, exportCsv } from '@/domain/export/exportData';
import { SettingsRow, SettingsSection } from '@/features/settings/SettingsRow';
import { ScreenHeader, Text, useThemeColors, useTranslation } from '@/ui';

/**
 * エクスポート。
 * **無料プランでも使える。** 端末内にしかデータが無いため。
 */
export default function ExportScreen() {
  const theme = useThemeColors();
  const t = useTranslation();
  const insets = useSafeAreaInsets();
  const db = useDatabase();
  const [busy, setBusy] = useState(false);

  const share = async (format: 'json' | 'csv') => {
    setBusy(true);
    try {
      const now = new Date();
      const stamp = now.toISOString().slice(0, 10);

      const content = format === 'json' ? buildJson(db, now) : exportCsv(db);

      const file = new FileSystem.File(FileSystem.Paths.cache, `yomi-${stamp}.${format}`);
      if (file.exists) file.delete();
      file.write(content);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: format === 'json' ? 'application/json' : 'text/csv',
          dialogTitle: t('export.shareTitle'),
        });
      } else {
        Alert.alert(t('export.unavailable'), t('export.unavailableDescription'));
      }
    } catch {
      Alert.alert(t('export.failed'), t('common.retryLater'));
    } finally {
      setBusy(false);
    }
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
      <ScreenHeader title={t('export.title')} onBack={() => router.back()} />

      <Text variant="caption" style={{ color: theme['ink-2'] }}>
        {t('export.description')}
      </Text>

      <SettingsSection title={t('export.sectionFormat')}>
        <SettingsRow
          label={t('export.json')}
          onPress={busy ? undefined : () => void share('json')}
        />
        <SettingsRow label={t('export.csv')} onPress={busy ? undefined : () => void share('csv')} />
      </SettingsSection>
    </ScrollView>
  );
}
