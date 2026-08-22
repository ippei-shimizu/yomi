import { router } from 'expo-router';
import { Alert, Linking, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { THEME_PREFERENCES, type ThemePreference } from '@/design/scheme';
import { layout } from '@/design/tokens';
import { useEntitlement, usePurchaseActions } from '@/domain/entitlement';
import { LEGAL_DOCUMENT_IDS, legalDocument } from '@/features/legal/documents';
import { SUPPORT_URL } from '@/features/settings/appInfo';
import { ProBanner } from '@/features/settings/ProBanner';
import { SettingsRow, SettingsSection } from '@/features/settings/SettingsRow';
import {
  useNotificationTimesSetting,
  useReadConfirmSetting,
  useThemeSetting,
} from '@/features/settings/useSettings';
import { VersionRow } from '@/features/settings/VersionRow';
import { Text, useThemeColors } from '@/ui';
import { useQueryClient } from '@tanstack/react-query';

const THEME_LABELS: Record<ThemePreference, string> = {
  system: 'システム',
  light: 'ライト',
  dark: 'ダーク',
};

export default function SettingsScreen() {
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { isPro, limits } = useEntitlement();
  const { restore } = usePurchaseActions(() => {
    void queryClient.invalidateQueries({ queryKey: ['entitlement'] });
  });

  const [readConfirm, setReadConfirm] = useReadConfirmSetting();
  const [notificationTimes] = useNotificationTimesSetting();
  const [themePreference, setThemePreference] = useThemeSetting();

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
        設定
      </Text>

      {isPro ? null : (
        <ProBanner
          onPress={() => router.push({ pathname: '/paywall', params: { trigger: 'settings' } })}
        />
      )}

      <SettingsSection title="通知">
        <SettingsRow
          label="今日の 1 本"
          value={notificationTimes}
          onPress={() => router.push('/(tabs)/settings/notification')}
        />
        <SettingsRow
          label="読了確認シート"
          toggle={{ value: readConfirm, onChange: setReadConfirm }}
        />
      </SettingsSection>

      <SettingsSection title="整理">
        <SettingsRow label="タグ管理" onPress={() => router.push('/(tabs)/settings/tags')} />
        <SettingsRow
          label="エクスポート (JSON / CSV)"
          onPress={() => router.push('/(tabs)/settings/export')}
        />
        <SettingsRow
          label="URL をまとめて追加"
          badge={limits.urlImport ? undefined : 'Pro'}
          onPress={() =>
            limits.urlImport
              ? router.push('/(tabs)/settings/import')
              : router.push({ pathname: '/paywall', params: { trigger: 'import' } })
          }
        />
      </SettingsSection>

      <SettingsSection title="表示">
        <SettingsRow
          label="テーマ"
          value={THEME_LABELS[themePreference]}
          onPress={() =>
            Alert.alert('テーマ', undefined, [
              // 選べる値は THEME_PREFERENCES から作る。増えたときに出し忘れない
              ...THEME_PREFERENCES.map((preference) => ({
                text: THEME_LABELS[preference],
                onPress: () => setThemePreference(preference),
              })),
              { text: 'やめる', style: 'cancel' as const },
            ])
          }
        />
      </SettingsSection>

      <SettingsSection title="サポート">
        <SettingsRow
          label="共有シートの設定方法"
          onPress={() => router.push('/onboarding/share')}
        />
        <SettingsRow label="お問い合わせ" onPress={() => void Linking.openURL(SUPPORT_URL)} />
        <SettingsRow
          label="購入を復元"
          onPress={() => {
            void restore()
              .then(() => Alert.alert('復元しました', '購入内容を確認しました。'))
              .catch(() => Alert.alert('復元できませんでした', '購入履歴が見つかりませんでした。'));
          }}
        />
      </SettingsSection>

      <SettingsSection title="情報">
        {LEGAL_DOCUMENT_IDS.map((id) => (
          <SettingsRow
            key={id}
            label={legalDocument(id).title}
            onPress={() => router.push({ pathname: '/legal', params: { doc: id } })}
          />
        ))}
        <VersionRow onUnlock={() => router.push('/dev-unlock')} />
      </SettingsSection>
    </ScrollView>
  );
}
