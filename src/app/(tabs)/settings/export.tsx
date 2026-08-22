import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDatabase } from '@/db/DatabaseProvider';
import { layout } from '@/design/tokens';
import { buildJson, exportCsv } from '@/domain/export/exportData';
import { SettingsRow, SettingsSection } from '@/features/settings/SettingsRow';
import { Text, useThemeColors } from '@/ui';

/**
 * エクスポート。
 * **無料プランでも使える。** 端末内にしかデータが無いため。
 */
export default function ExportScreen() {
  const theme = useThemeColors();
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
          dialogTitle: 'Yomi のデータ',
        });
      } else {
        Alert.alert('共有できません', 'この端末では共有シートを利用できません。');
      }
    } catch {
      Alert.alert('書き出せませんでした', 'しばらくしてからもう一度お試しください。');
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
          エクスポート
        </Text>
      </View>

      <Text variant="caption" style={{ color: theme['ink-2'] }}>
        データは端末内にのみ保存されています。機種変更や紛失に備えて、ときどき書き出しておいてください。
      </Text>

      <SettingsSection title="形式">
        <SettingsRow
          label="JSON（全項目・復元用）"
          onPress={busy ? undefined : () => void share('json')}
        />
        <SettingsRow
          label="CSV（表計算ソフト向け）"
          onPress={busy ? undefined : () => void share('csv')}
        />
      </SettingsSection>
    </ScrollView>
  );
}
