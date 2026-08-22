import * as Notifications from 'expo-notifications';

import { statsRepo } from '@/db/repositories';
import type { YomiDatabase } from '@/db/types';
import { dateKeyOf, pickToday } from '@/domain/pick/pickToday';
import { displayTitle } from '@/features/items/display';
import { getString, storageKeys } from '@/lib/storage';

import {
  DEFAULT_NOTIFICATION_TIME,
  occurrencesFor,
  parseTimeList,
  type TimeOfDay,
} from './schedule';

/**
 * 今日の 1 本のローカル通知。
 *
 *   起動時・アイテム状態変更時・設定変更時に再計算:
 *     1. 既存の scheduled notification を全キャンセル
 *     2. unread かつ snoozedUntil <= now から Today's Pick と同じ選び方で 1 件
 *     3. 0 件なら終了
 *     4. 設定時刻ごとに翌 7 日分をスケジュール。payload に itemId
 *     5. 通知タップ → /item/[id]?open=1
 *
 * サーバレスのため「通知時点の最新未読」ではなく「スケジュール時点の未読」に
 * なる。起動のたびに再計算するため実用上のずれは小さいと判断して許容する。
 */

export const NOTIFICATION_ITEM_ID = 'itemId';

export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/** 設定されている通知時刻。Pro は複数 */
export function readNotificationTimes(): TimeOfDay[] {
  return parseTimeList(getString(storageKeys.notificationTimes) ?? DEFAULT_NOTIFICATION_TIME);
}

export async function requestPermission(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function hasPermission(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

export type RescheduleResult = { scheduled: number; itemId: string | null };

/**
 * 通知を再計算する。既存を全キャンセルしてから積み直すので冪等。
 */
export async function rescheduleDailyPick(
  db: YomiDatabase,
  now = new Date(),
): Promise<RescheduleResult> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  if (!(await hasPermission())) return { scheduled: 0, itemId: null };

  const candidates = statsRepo.pickCandidates(db, now);
  // 未読 0 件のときは通知しない
  const item = pickToday(candidates, dateKeyOf(now));
  if (item === null) return { scheduled: 0, itemId: null };

  const occurrences = occurrencesFor(readNotificationTimes(), now);

  for (const occurrence of occurrences) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '今日の 1 本',
        body: displayTitle(item),
        data: { [NOTIFICATION_ITEM_ID]: item.id },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: occurrence },
    });
  }

  return { scheduled: occurrences.length, itemId: item.id };
}

/** 通知の data から itemId を取り出す。壊れていれば null */
export function itemIdFromNotification(data: unknown): string | null {
  if (typeof data !== 'object' || data === null) return null;
  const value = (data as Record<string, unknown>)[NOTIFICATION_ITEM_ID];
  return typeof value === 'string' && value.length > 0 ? value : null;
}
