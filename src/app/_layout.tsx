import '@/ui/global.css';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { configureNotificationHandler } from '@/domain/notification';
import { configurePurchases } from '@/domain/entitlement';
import { AppShell } from '@/features/shell/AppShell';
import { MigrationGate } from '@/features/shell/MigrationGate';
import { initAnalytics } from '@/lib/analytics';
import { config } from '@/lib/config';
import { initSentry } from '@/lib/sentry';
import { useAppFonts } from '@/ui';

// 外部サービスの初期化はモジュール読み込み時に一度だけ。
// いずれもキー未設定なら何もしない（起動を妨げない）。
configureNotificationHandler();
initSentry(config.sentry.dsn);
initAnalytics(config.posthog.apiKey, config.posthog.host);
if (config.revenueCat.apiKey.length > 0) configurePurchases(config.revenueCat.apiKey);

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
