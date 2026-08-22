import { describe, expect, it } from 'vitest';

import { PRO_FEATURES } from '@/domain/entitlement/plan';

import {
  DEFAULT_PLAN,
  PLANS,
  PRO_BENEFITS,
  TRIGGER_HEADLINES,
  ctaLabelFor,
  headlineFor,
  renewalNoticeFor,
  type PlanKind,
} from './copy';

const ALL_PLANS: PlanKind[] = ['monthly', 'annual', 'lifetime'];

describe('プラン（docs/PRD.md §10 の価格）', () => {
  it('3 プランある', () => {
    expect(PLANS.map((p) => p.kind)).toEqual(ALL_PLANS);
  });

  it('価格が決定事項どおり', () => {
    expect(PLANS.find((p) => p.kind === 'monthly')?.fallbackPrice).toContain('400');
    expect(PLANS.find((p) => p.kind === 'annual')?.fallbackPrice).toContain('2,800');
    expect(PLANS.find((p) => p.kind === 'lifetime')?.fallbackPrice).toContain('5,800');
  });

  it('年額だけに「7日間無料」バッジが付く', () => {
    expect(PLANS.filter((p) => p.badge !== undefined).map((p) => p.kind)).toEqual(['annual']);
  });

  it('既定は年額（docs/Screens.md S12）', () => {
    expect(DEFAULT_PLAN).toBe('annual');
  });
});

describe('審査要件: 自動更新の明記（docs/PRD.md §7.5）', () => {
  it.each(['monthly', 'annual'] as const)('%s は価格・期間・自動更新・解約方法を含む', (plan) => {
    const notice = renewalNoticeFor(plan);

    expect(notice).toMatch(/¥[\d,]+/);
    expect(notice).toContain('自動更新');
    expect(notice).toContain('App Store');
    expect(notice).toContain('解約');
  });

  it('年額はトライアル終了後に課金される旨を含む', () => {
    expect(renewalNoticeFor('annual')).toContain('無料トライアル終了後');
  });

  // 買い切りに自動更新の説明を出すと誤解を招く
  it('買い切りは自動更新が無いことを明記する', () => {
    const notice = renewalNoticeFor('lifetime');
    expect(notice).toContain('自動更新はありません');
    expect(notice).not.toContain('解約');
  });
});

describe('CTA', () => {
  it.each(ALL_PLANS)('%s に文言がある', (plan) => {
    expect(ctaLabelFor(plan).length).toBeGreaterThan(0);
  });

  it('年額はトライアルを訴求する', () => {
    expect(ctaLabelFor('annual')).toContain('無料');
  });

  // 煽らない（docs/DesignGuideline.md §7）
  it('感嘆符や「今すぐ」を含まない', () => {
    for (const plan of ALL_PLANS) {
      expect(ctaLabelFor(plan)).not.toMatch(/[!！]/);
      expect(ctaLabelFor(plan)).not.toContain('今すぐ');
    }
  });
});

describe('特典リスト', () => {
  it('docs/PRD.md §7.5 の Pro 機能を網羅する', () => {
    expect(PRO_BENEFITS).toEqual([
      '保存件数 無制限',
      'タグ 無制限',
      'メモ全文検索',
      '放置アイテムの一括整理',
      '通知時刻を複数設定',
    ]);
  });

  it('エクスポートを Pro 特典に入れない（無料でも使えるため）', () => {
    expect(PRO_BENEFITS.join()).not.toContain('エクスポート');
  });
});

describe('トリガー', () => {
  it('docs/Screens.md S12 の 6 種すべてに見出しがある', () => {
    for (const trigger of PRO_FEATURES) {
      expect(TRIGGER_HEADLINES[trigger]).toBeDefined();
    }
  });

  it('未知のトリガー・未指定は settings の見出しに倒す', () => {
    expect(headlineFor(undefined)).toBe(TRIGGER_HEADLINES['settings']);
    expect(headlineFor('unknown')).toBe(TRIGGER_HEADLINES['settings']);
  });

  it('見出しが事実の提示に留まっている', () => {
    for (const headline of Object.values(TRIGGER_HEADLINES)) {
      expect(headline).not.toMatch(/[!！]/);
      expect(headline).not.toContain('今すぐ');
      expect(headline).not.toContain('アップグレード！');
    }
  });
});
