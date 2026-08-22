import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';

import { queryKeys } from '@/db/queryKeys';
import type { YomiDatabase } from '@/db/types';
import { useQueryClient } from '@tanstack/react-query';

import { capture } from '@/lib/analytics';
import { useTranslation } from '@/ui';

import { itemIdFromNotification, rescheduleDailyPick } from './notifications';

/**
 * 通知の再スケジュールとタップ時の遷移。
 *
 * items が変わると Today's Pick の候補も変わるので、React Query の
 * items キャッシュが更新されるたびに積み直す。
 */
export function useDailyPickNotification(db: YomiDatabase) {
  const queryClient = useQueryClient();
  const t = useTranslation();

  useEffect(() => {
    void rescheduleDailyPick(t, db);

    // items が書き換わったら通知を積み直す（起動時・状態変更時・設定変更時）
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type !== 'updated') return;
      const key = event.query.queryKey;
      if (Array.isArray(key) && key[0] === queryKeys.items[0]) {
        void rescheduleDailyPick(t, db);
      }
    });

    return unsubscribe;
    // 言語を変えたら、積んである通知も新しい言語で積み直す
  }, [db, queryClient, t]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const itemId = itemIdFromNotification(response.notification.request.content.data);
      // 通知タップで直接ブラウザを開く
      if (itemId !== null) {
        capture({ name: 'notification_opened' });
        router.push({ pathname: '/item/[id]', params: { id: itemId, open: '1' } });
      }
    });

    return () => subscription.remove();
  }, []);
}
