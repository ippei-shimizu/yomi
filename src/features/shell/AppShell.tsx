import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';

import { useDatabase } from '@/db/DatabaseProvider';
import { useMetaFetchWorker } from '@/domain/meta';
import { useDailyPickNotification } from '@/domain/notification';
import { useOnboardingCompleted } from '@/features/settings/useSettings';
import { useAnalyticsSync } from '@/lib/analyticsSync';
import { useApplyColorScheme, useIsDark, useThemeColors } from '@/ui';

/**
 * ナビゲーションの骨格と、アプリ全体で回すバックグラウンド処理。
 *
 * DB を要求するので MigrationGate の内側でしか描画できない。
 */
export function AppShell() {
  const theme = useThemeColors();
  const isDark = useIsDark();
  const db = useDatabase();
  const [onboardingCompleted] = useOnboardingCompleted();

  // テーマ設定を NativeWind にも反映する
  useApplyColorScheme();
  // 起動のたびにメタ取得を回す
  useMetaFetchWorker(db);
  // 通知は items が変わるたびに積み直す
  useDailyPickNotification(db);
  // Share Extension での保存を read_logs 経由で分析に送る
  useAnalyticsSync(db);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* 設定でテーマを固定できるので、端末設定に追従する "auto" は使えない */}
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {/* ヘッダーはナビバーを使わず、各画面がコンテンツ先頭に置く */}
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }}>
        {/* 初回のみ Onboarding から始める */}
        <Stack.Protected guard={onboardingCompleted}>
          <Stack.Screen name="(tabs)" />
        </Stack.Protected>
        <Stack.Protected guard={!onboardingCompleted}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Screen name="item/[id]" />
        <Stack.Screen name="stale" />
        <Stack.Screen name="legal" />
        <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
        <Stack.Screen name="dev-unlock" options={{ presentation: 'modal' }} />
      </Stack>
    </View>
  );
}
