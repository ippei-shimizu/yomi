import { describe, expect, it } from 'vitest';

import { PRO_FEATURES } from '@/domain/entitlement/plan';
import { createTranslate, LOCALES, type Locale } from '@/lib/i18n';

import {
  DEFAULT_PLAN,
  PLANS,
  PRO_BENEFIT_KEYS,
  ctaLabelKeyFor,
  headlineKeyFor,
  renewalNoticeKeyFor,
  type PlanKind,
} from './copy';

const ALL_PLANS: PlanKind[] = ['monthly', 'annual', 'lifetime'];
const ja = createTranslate('ja');

describe('プランと価格', () => {
  it('3 プランある', () => {
    expect(PLANS.map((p) => p.kind)).toEqual(ALL_PLANS);
  });

  it.each(LOCALES)('%s で価格が決定事項どおり', (locale: Locale) => {
    const t = createTranslate(locale);
    const priceOf = (kind: PlanKind) => {
      const plan = PLANS.find((p) => p.kind === kind);
      return plan === undefined ? '' : t(plan.fallbackPriceKey);
    };

    expect(priceOf('monthly')).toContain('400');
    expect(priceOf('annual')).toContain('2,800');
    expect(priceOf('lifetime')).toContain('5,800');
  });

  it('年額だけに無料トライアルのバッジが付く', () => {
    expect(PLANS.filter((p) => p.badgeKey !== undefined).map((p) => p.kind)).toEqual(['annual']);
  });

  it('既定は年額', () => {
    expect(DEFAULT_PLAN).toBe('annual');
  });
});

describe('審査要件: 自動更新の明記', () => {
  // 審査は英語圏でも行われるので、両言語で満たす必要がある
  it.each(['monthly', 'annual'] as const)(
    'ja: %s は価格・期間・自動更新・解約方法を含む',
    (plan) => {
      const notice = ja(renewalNoticeKeyFor(plan));

      expect(notice).toMatch(/¥[\d,]+/);
      expect(notice).toContain('自動更新');
      expect(notice).toContain('App Store');
      expect(notice).toContain('解約');
    },
  );

  it.each(['monthly', 'annual'] as const)(
    'en: %s は価格・期間・自動更新・解約方法を含む',
    (plan) => {
      const notice = createTranslate('en')(renewalNoticeKeyFor(plan));

      expect(notice).toMatch(/¥[\d,]+/);
      expect(notice).toContain('renews automatically');
      expect(notice).toContain('App Store');
      expect(notice).toContain('cancel');
    },
  );

  it('年額はトライアル終了後に課金される旨を含む', () => {
    expect(ja(renewalNoticeKeyFor('annual'))).toContain('無料トライアル終了後');
    expect(createTranslate('en')(renewalNoticeKeyFor('annual'))).toContain('After the free trial');
  });

  // 買い切りに自動更新の説明を出すと誤解を招く
  it('買い切りは自動更新が無いことを明記する', () => {
    const notice = ja(renewalNoticeKeyFor('lifetime'));
    expect(notice).toContain('自動更新はありません');
    expect(notice).not.toContain('解約');

    expect(createTranslate('en')(renewalNoticeKeyFor('lifetime'))).toContain('does not renew');
  });
});

describe('CTA', () => {
  it.each(LOCALES)('%s: 全プランに文言がある', (locale: Locale) => {
    const t = createTranslate(locale);
    for (const plan of ALL_PLANS) {
      expect(t(ctaLabelKeyFor(plan)).length).toBeGreaterThan(0);
    }
  });

  it('年額はトライアルを訴求する', () => {
    expect(ja(ctaLabelKeyFor('annual'))).toContain('無料');
    expect(createTranslate('en')(ctaLabelKeyFor('annual'))).toContain('free');
  });

  // 煽らない
  it.each(LOCALES)('%s: 感嘆符や「今すぐ」を含まない', (locale: Locale) => {
    const t = createTranslate(locale);
    for (const plan of ALL_PLANS) {
      expect(t(ctaLabelKeyFor(plan))).not.toMatch(/[!！]/);
      expect(t(ctaLabelKeyFor(plan))).not.toContain('今すぐ');
      expect(t(ctaLabelKeyFor(plan)).toLowerCase()).not.toContain('now');
    }
  });
});

describe('特典リスト', () => {
  it('Pro 限定機能を網羅する', () => {
    expect(PRO_BENEFIT_KEYS.map((key) => ja(key))).toEqual([
      '保存件数 無制限',
      'タグ 無制限',
      'メモ全文検索',
      '放置アイテムの一括整理',
      '通知時刻を複数設定',
    ]);
  });

  it.each(LOCALES)(
    '%s: エクスポートを Pro 特典に入れない（無料でも使えるため）',
    (locale: Locale) => {
      const t = createTranslate(locale);
      const joined = PRO_BENEFIT_KEYS.map((key) => t(key))
        .join()
        .toLowerCase();
      expect(joined).not.toContain('エクスポート');
      expect(joined).not.toContain('export');
    },
  );
});

describe('トリガー', () => {
  it('トリガー 6 種すべてに見出しがある', () => {
    for (const trigger of PRO_FEATURES) {
      const key = headlineKeyFor(trigger);
      expect(ja(key), trigger).not.toBe(key);
    }
  });

  it('未知のトリガー・未指定は settings の見出しに倒す', () => {
    expect(headlineKeyFor(undefined)).toBe(headlineKeyFor('settings'));
    expect(headlineKeyFor('unknown')).toBe(headlineKeyFor('settings'));
  });

  it.each(LOCALES)('%s: 見出しが事実の提示に留まっている', (locale: Locale) => {
    const t = createTranslate(locale);
    for (const trigger of [...PRO_FEATURES, 'settings', undefined]) {
      const headline = t(headlineKeyFor(trigger));
      expect(headline).not.toMatch(/[!！]/);
      expect(headline).not.toContain('今すぐ');
      expect(headline.toLowerCase()).not.toContain('upgrade now');
    }
  });
});
