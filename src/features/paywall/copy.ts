/**
 * Paywall の文言。
 *
 * **App Store の審査要件を満たす必要がある**。
 * 文言を画面に散らさず、ここに集約してテストで検証する。
 * react-native を import しない純粋モジュール。
 */

export type PlanKind = 'monthly' | 'annual' | 'lifetime';

export type PlanCopy = {
  kind: PlanKind;
  label: string;
  /** 価格の表示。RevenueCat の localizedPriceString で上書きする */
  fallbackPrice: string;
  /** 年額のみ「7日間無料」バッジを出す */
  badge?: string;
};

/** 価格は決定済みの値 */
export const PLANS: readonly PlanCopy[] = [
  { kind: 'monthly', label: '月額', fallbackPrice: '¥400 / 月' },
  { kind: 'annual', label: '年額', fallbackPrice: '¥2,800 / 年', badge: '7日間無料' },
  { kind: 'lifetime', label: '買い切り', fallbackPrice: '¥5,800 一回' },
];

/** 既定で選択されるプラン */
export const DEFAULT_PLAN: PlanKind = 'annual';

/** Pro の特典。無料 / Pro の比較表と対応させる */
export const PRO_BENEFITS = [
  '保存件数 無制限',
  'タグ 無制限',
  'メモ全文検索',
  '放置アイテムの一括整理',
  '通知時刻を複数設定',
] as const;

/** CTA の文言。選択に応じて変わる */
export function ctaLabelFor(plan: PlanKind): string {
  switch (plan) {
    case 'annual':
      return '7 日間無料で試す';
    case 'monthly':
      return '月額で始める';
    case 'lifetime':
      return '買い切りで購入';
  }
}

/**
 * 自動更新の説明。**審査要件**（価格・期間・自動更新の明記）。
 * 買い切りには自動更新が無いので文言を分ける。
 */
export function renewalNoticeFor(plan: PlanKind): string {
  switch (plan) {
    case 'annual':
      return '年額プランは無料トライアル終了後、¥2,800/年で自動更新されます。いつでも App Store から解約できます。';
    case 'monthly':
      return '月額プランは ¥400/月で自動更新されます。いつでも App Store から解約できます。';
    case 'lifetime':
      return '買い切りは一度のお支払いです。自動更新はありません。';
  }
}

/** Paywall を開いた理由。PostHog の paywall_viewed.trigger に対応 */
export const TRIGGER_HEADLINES: Record<string, string> = {
  limit_save: '保存できる件数の上限に達しました',
  limit_tag: 'タグの上限に達しました',
  stale_bulk: '一括整理は Pro の機能です',
  memo_search: 'メモの全文検索は Pro の機能です',
  import: 'URL の一括インポートは Pro の機能です',
  settings: 'Yomi Pro',
};

export function headlineFor(trigger: string | undefined): string {
  return TRIGGER_HEADLINES[trigger ?? 'settings'] ?? TRIGGER_HEADLINES['settings']!;
}
