import '@/ui/global.css';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useAppFonts, useThemeColors } from '@/ui';

function AppShell() {
  const theme = useThemeColors();

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

export default function RootLayout() {
  // QueryClient はアプリの生存期間で 1 つ。再レンダリングで作り直さない。
  const [queryClient] = useState(() => new QueryClient());
  const fontsReady = useAppFonts();

  if (!fontsReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AppShell />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
