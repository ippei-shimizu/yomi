import { describe, expect, it } from 'vitest';

import type { AnalyticsEvent } from './analytics';

/**
 * 定義したイベントと一致すること。
 *
 * PostHog クライアントは RN 依存なのでここでは動かさない。
 * **型で送信できるプロパティを縛っている**ことを、型テストで固定する。
 */
describe('AnalyticsEvent の型', () => {
  it('定義された 6 イベントを表現できる', () => {
    const events: AnalyticsEvent[] = [
      { name: 'item_saved', properties: { source: 'zenn' } },
      { name: 'item_read', properties: { days_since_saved: 12 } },
      { name: 'item_archived' },
      { name: 'notification_opened' },
      { name: 'paywall_viewed', properties: { trigger: 'limit_save' } },
      { name: 'purchase_completed', properties: { product: 'annual' } },
    ];

    expect(events.map((event) => event.name)).toEqual([
      'item_saved',
      'item_read',
      'item_archived',
      'notification_opened',
      'paywall_viewed',
      'purchase_completed',
    ]);
  });

  // 以下はコンパイルが通らないことに意味がある（@ts-expect-error が外れたら失敗する）
  it('URL やタイトルを混ぜられない', () => {
    const withUrl: AnalyticsEvent = {
      name: 'item_saved',
      // @ts-expect-error url は送れない
      properties: { source: 'zenn', url: 'https://zenn.dev/a' },
    };
    const withTitle: AnalyticsEvent = {
      name: 'item_read',
      // @ts-expect-error title は送れない
      properties: { days_since_saved: 1, title: 'x' },
    };
    // @ts-expect-error 未定義のイベント名は送れない
    const unknown: AnalyticsEvent = { name: 'item_opened' };

    expect([withUrl, withTitle, unknown]).toHaveLength(3);
  });
});
