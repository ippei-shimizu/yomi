import type { MessageKey } from '@/lib/i18n';

/**
 * Paywall の文言。
 *
 * **App Store の審査要件を満たす必要がある**。
 * 実際の文面は messages/ にあり、ここはどのキーを選ぶかだけを決める。
 * react-native を import しない純粋モジュール。
 */

export type PlanKind = 'monthly' | 'annual' | 'lifetime';

export type PlanCopy = {
  kind: PlanKind;
  labelKey: MessageKey;
  /** 価格の表示。RevenueCat の localizedPriceString で上書きする */
  fallbackPriceKey: MessageKey;
  /** 年額のみ「7日間無料」バッジを出す */
  badgeKey?: MessageKey;
};

/** 価格は決定済みの値 */
export const PLANS: readonly PlanCopy[] = [
  { kind: 'monthly', labelKey: 'paywall.planMonthly', fallbackPriceKey: 'paywall.priceMonthly' },
  {
    kind: 'annual',
    labelKey: 'paywall.planAnnual',
    fallbackPriceKey: 'paywall.priceAnnual',
    badgeKey: 'paywall.trialBadge',
  },
  { kind: 'lifetime', labelKey: 'paywall.planLifetime', fallbackPriceKey: 'paywall.priceLifetime' },
];

/** 既定で選択されるプラン */
export const DEFAULT_PLAN: PlanKind = 'annual';

/** Pro の特典。無料 / Pro の比較表と対応させる */
export const PRO_BENEFIT_KEYS = [
  'paywall.benefitUnlimitedItems',
  'paywall.benefitUnlimitedTags',
  'paywall.benefitMemoSearch',
  'paywall.benefitStaleBulk',
  'paywall.benefitMultipleTimes',
] as const satisfies readonly MessageKey[];

/** CTA の文言。選択に応じて変わる */
export function ctaLabelKeyFor(plan: PlanKind): MessageKey {
  switch (plan) {
    case 'annual':
      return 'paywall.ctaAnnual';
    case 'monthly':
      return 'paywall.ctaMonthly';
    case 'lifetime':
      return 'paywall.ctaLifetime';
  }
}

/**
 * 自動更新の説明。**審査要件**（価格・期間・自動更新の明記）。
 * 買い切りには自動更新が無いので文言を分ける。
 */
export function renewalNoticeKeyFor(plan: PlanKind): MessageKey {
  switch (plan) {
    case 'annual':
      return 'paywall.renewalAnnual';
    case 'monthly':
      return 'paywall.renewalMonthly';
    case 'lifetime':
      return 'paywall.renewalLifetime';
  }
}

/** Paywall を開いた理由。PostHog の paywall_viewed.trigger に対応 */
const TRIGGER_HEADLINE_KEYS: Record<string, MessageKey> = {
  limit_save: 'paywall.headlineLimitSave',
  limit_tag: 'paywall.headlineLimitTag',
  stale_bulk: 'paywall.headlineStaleBulk',
  memo_search: 'paywall.headlineMemoSearch',
  import: 'paywall.headlineImport',
  settings: 'settings.proTitleBare',
};

const DEFAULT_HEADLINE_KEY: MessageKey = 'settings.proTitleBare';

export function headlineKeyFor(trigger: string | undefined): MessageKey {
  return TRIGGER_HEADLINE_KEYS[trigger ?? 'settings'] ?? DEFAULT_HEADLINE_KEY;
}
