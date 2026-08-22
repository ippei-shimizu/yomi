import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, layout, radius } from '@/design/tokens';
import { useEntitlement, usePurchaseActions } from '@/domain/entitlement';
import { SettingsRow, SettingsSection } from '@/features/settings/SettingsRow';
import {
  useNotificationTimesSetting,
  useReadConfirmSetting,
  useThemeSetting,
} from '@/features/settings/useSettings';
import { Card, Text, useThemeColors } from '@/ui';
import { useQueryClient } from '@tanstack/react-query';

/** バージョン表記を何回タップで Dev Unlock を開くか（docs/Screens.md S11） */
const DEV_UNLOCK_TAP_COUNT = 7;

const APP_VERSION = '0.1.0';
const SUPPORT_URL = 'https://example.com/yomi/support';

const THEME_LABELS = { system: 'システム', light: 'ライト', dark: 'ダーク' } as const;

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
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/paywall', params: { trigger: 'settings' } })}
        >
          <Card size="large" backgroundColor={colors.brand.brand}>
            <View style={{ padding: 20, gap: 4 }}>
              <Text variant="heading" style={{ color: '#FFFFFF' }}>
                ★ Yomi Pro
              </Text>
              <Text variant="caption" style={{ color: '#FFFFFF', opacity: 0.85 }}>
                上限解除・メモ検索・一括整理
              </Text>
            </View>
          </Card>
        </Pressable>
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
              { text: 'システム', onPress: () => setThemePreference('system') },
              { text: 'ライト', onPress: () => setThemePreference('light') },
              { text: 'ダーク', onPress: () => setThemePreference('dark') },
              { text: 'やめる', style: 'cancel' },
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
        <SettingsRow label="利用規約" onPress={() => router.push('/(tabs)/settings/about')} />
        <SettingsRow
          label="プライバシーポリシー"
          onPress={() => router.push('/(tabs)/settings/about')}
        />
        <SettingsRow
          label="特定商取引法に基づく表記"
          onPress={() => router.push('/(tabs)/settings/about')}
        />
        <VersionRow />
      </SettingsSection>
    </ScrollView>
  );
}

/** 7 回タップで Dev Unlock（docs/Screens.md S11 / S13） */
function VersionRow() {
  const theme = useThemeColors();
  const taps = useRef(0);
  const [, force] = useState(0);

  return (
    <Card>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`バージョン ${APP_VERSION}`}
        onPress={() => {
          taps.current += 1;
          if (taps.current >= DEV_UNLOCK_TAP_COUNT) {
            taps.current = 0;
            router.push('/dev-unlock');
          }
          force((n) => n + 1);
        }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 14,
          minHeight: 52,
          borderRadius: radius.card,
        }}
      >
        <Text variant="body" style={{ flex: 1, color: theme.ink }}>
          バージョン
        </Text>
        <Text variant="body" script="latin" style={{ color: theme['ink-2'] }}>
          {APP_VERSION}
        </Text>
      </Pressable>
    </Card>
  );
}
