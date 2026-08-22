import PostHog from 'posthog-react-native';

import type { Source } from '@/domain/url';
import type { PaywallTrigger } from '@/domain/entitlement/plan';

/**
 * 分析イベント（docs/DesignDoc.md §7.3）。
 *
 * **個人特定情報・URL・タイトルは送らない。** 送ってよいのは下の型で
 * 定義したプロパティだけ。型で縛ることで、呼び出し側が任意の値を
 * 混ぜられないようにする（R-SEC1）。
 *
 * 本体アプリでのみ初期化する。Share Extension では初期化しない。
 */
export type AnalyticsEvent =
  | { name: 'item_saved'; properties: { source: Source } }
  | { name: 'item_read'; properties: { days_since_saved: number } }
  | { name: 'item_archived'; properties?: undefined }
  | { name: 'notification_opened'; properties?: undefined }
  | { name: 'paywall_viewed'; properties: { trigger: PaywallTrigger } }
  | { name: 'purchase_completed'; properties: { product: string } };

let client: PostHog | undefined;

export function initAnalytics(apiKey: string, host: string): void {
  if (client !== undefined) return;
  if (apiKey.length === 0) return;

  client = new PostHog(apiKey, {
    host,
    // 端末を跨いだ追跡はしない。アカウント機能が無いため
    disableGeoip: true,
  });
}

/**
 * イベントを送る。初期化されていなければ何もしない
 * （API キー未設定でもアプリは動く）。
 */
export function capture(event: AnalyticsEvent): void {
  client?.capture(event.name, event.properties);
}

/** テストと Extension 用。送信先を持たない状態に戻す */
export function resetAnalytics(): void {
  client = undefined;
}
