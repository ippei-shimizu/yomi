/**
 * 無料プランの上限（docs/PRD.md §7.5）。
 * react-native を import しない純粋モジュール（R-UI5）。
 */

import { itemRepo, tagRepo } from '@/db/repositories';
import type { YomiDatabase } from '@/db/types';

/** Pro でのみ使える機能。Paywall のトリガー名と 1 対 1 に対応させる */
export const PRO_FEATURES = [
  'limit_save',
  'limit_tag',
  'stale_bulk',
  'memo_search',
  'import',
  'settings',
] as const;

export type PaywallTrigger = (typeof PRO_FEATURES)[number];

export type PlanLimits = {
  /** 保存できる件数の上限。Pro は null（無制限） */
  itemLimit: number | null;
  tagLimit: number | null;
  /** 通知時刻を複数設定できるか */
  multipleNotificationTimes: boolean;
  memoSearch: boolean;
  staleBulkAction: boolean;
  urlImport: boolean;
};

export function limitsFor(isPro: boolean): PlanLimits {
  return isPro
    ? {
        itemLimit: null,
        tagLimit: null,
        multipleNotificationTimes: true,
        memoSearch: true,
        staleBulkAction: true,
        urlImport: true,
      }
    : {
        itemLimit: itemRepo.FREE_PLAN_ITEM_LIMIT,
        tagLimit: tagRepo.FREE_PLAN_TAG_LIMIT,
        multipleNotificationTimes: false,
        memoSearch: false,
        staleBulkAction: false,
        urlImport: false,
      };
}

/** 上限まであと何件か。Pro は null。上限到達済みは 0 */
export function remainingSaves(db: YomiDatabase, isPro: boolean): number | null {
  const limit = limitsFor(isPro).itemLimit;
  if (limit === null) return null;
  return Math.max(0, limit - itemRepo.countForLimit(db));
}

/** 「残り n 件」バナーを出すしきい値（docs/Screens.md S02） */
export const LIMIT_WARNING_REMAINING = 5;

export function shouldWarnAboutLimit(remaining: number | null): boolean {
  return remaining !== null && remaining <= LIMIT_WARNING_REMAINING;
}
