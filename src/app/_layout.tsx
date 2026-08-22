import '@/ui/global.css';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { openSharedDb } from '@/db/client';
import { DatabaseProvider, useDatabase } from '@/db/DatabaseProvider';
import { useMigrations } from '@/db/migrations';
import { useMetaFetchWorker } from '@/domain/meta';
import { configureNotificationHandler, useDailyPickNotification } from '@/domain/notification';
import { Text, useAppFonts, useThemeColors } from '@/ui';

/**
 * マイグレーションを適用してから画面を出す。
 *
 * 適用前に描画すると、存在しないテーブルを引いて落ちる。
 * useMigrations は expo-sqlite 固有の型を要求するため、
 * ここだけ openSharedDb() の具象型をそのまま使う。
 */
function MigrationGate({ children }: { children: ReactNode }) {
  const [db] = useState(openSharedDb);
  const { success, error } = useMigrations(db);

  if (error !== undefined) {
    // マイグレーションに失敗したらデータを触らせない。
    // ここで先に進むと不整合なスキーマに書き込むことになる。
    return <StartupError message="データベースの準備に失敗しました" />;
  }
  if (!success) return null;

  return <DatabaseProvider db={db}>{children}</DatabaseProvider>;
}

function StartupError({ message }: { message: string }) {
  const theme = useThemeColors();
  return (
    <View
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bg }}
    >
      <Text variant="body" style={{ color: theme.ink }}>
        {message}
      </Text>
    </View>
  );
}

function AppShell() {
  const theme = useThemeColors();
  const db = useDatabase();

  // 起動のたびにメタ取得を回す（docs/DesignDoc.md §5.2）
  useMetaFetchWorker(db);
  // 通知は items が変わるたびに積み直す（§5.4）
  useDailyPickNotification(db);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar style="auto" />
      {/* ヘッダーはナビバーを使わず、各画面がコンテンツ先頭に置く（§5） */}
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="item/[id]" />
        <Stack.Screen name="stale" />
        <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
        <Stack.Screen name="dev-unlock" options={{ presentation: 'modal' }} />
      </Stack>
    </View>
  );
}

// 通知の表示方法はモジュール読み込み時に一度だけ設定する
configureNotificationHandler();

export default function RootLayout() {
  // QueryClient はアプリの生存期間で 1 つ。再レンダリングで作り直さない。
  const [queryClient] = useState(() => new QueryClient());
  const fontsReady = useAppFonts();

  if (!fontsReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <MigrationGate>
          <AppShell />
        </MigrationGate>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
