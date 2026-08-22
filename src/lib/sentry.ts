import * as Sentry from '@sentry/react-native';

import { scrubEvent, shouldDropBreadcrumb } from './scrub';

/**
 * クラッシュレポート（docs/DesignDoc.md §2）。
 *
 * **URL・タイトル・メモを送らない。** 実際に落とす処理は scrub.ts にあり、
 * そちらでテストしている（R-SEC1）。
 */
export function initSentry(dsn: string): void {
  // DSN 未設定なら初期化しない。設定漏れでアプリが落ちないようにする
  if (dsn.length === 0) return;

  Sentry.init({
    dsn,
    enableAutoPerformanceTracing: false,
    sendDefaultPii: false,
    beforeSend: (event) => scrubEvent(event),
    beforeBreadcrumb: (breadcrumb) => (shouldDropBreadcrumb(breadcrumb) ? null : breadcrumb),
  });
}
