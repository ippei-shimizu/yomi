import { and, count, eq, gt, gte, lt, sql } from 'drizzle-orm';

import { addDays, daysBetween, recentWeekStarts, startOfWeek } from '@/domain/date/week';
import type { Source } from '@/domain/url';

import { items, readLogs } from '../schema';
import type { YomiDatabase } from '../types';
import { countStale, notSnoozed } from './itemRepo';

/** Stats の棒グラフに出す週数 */
export const RECENT_WEEKS = 8;

export type WeeklySummary = {
  /** その週の月曜 00:00 */
  weekStart: Date;
  saved: number;
  read: number;
  /** 読了率（0–1）。保存 0 件のときは null。0% と「データなし」を区別する */
  readRate: number | null;
};

function countEvents(db: YomiDatabase, event: 'saved' | 'read', from: Date, to: Date): number {
  const row = db
    .select({ value: count() })
    .from(readLogs)
    .where(and(eq(readLogs.event, event), gte(readLogs.at, from), lt(readLogs.at, to)))
    .get();
  return row?.value ?? 0;
}

/**
 * 1 週間の集計。items の現在値ではなく read_logs の履歴から数えるので、
 * 読了 → 未読に戻す往復があっても、その週に読んだ事実は残る。
 */
export function weeklySummary(db: YomiDatabase, weekStart: Date): WeeklySummary {
  const weekEnd = addDays(weekStart, 7);
  const saved = countEvents(db, 'saved', weekStart, weekEnd);
  const read = countEvents(db, 'read', weekStart, weekEnd);

  return { weekStart, saved, read, readRate: saved === 0 ? null : read / saved };
}

/** 古い順に直近 count 週分。末尾が今週 */
export function recentWeeks(
  db: YomiDatabase,
  now = new Date(),
  count = RECENT_WEEKS,
): WeeklySummary[] {
  return recentWeekStarts(now, count).map((weekStart) => weeklySummary(db, weekStart));
}

export type CurrentStatus = {
  unread: number;
  stale: number;
  /** 保存から読了までの平均日数。読了実績が無ければ null */
  averageDaysToRead: number | null;
};

export function currentStatus(db: YomiDatabase, now = new Date()): CurrentStatus {
  const unread =
    db.select({ value: count() }).from(items).where(eq(items.status, 'unread')).get()?.value ?? 0;

  return {
    unread,
    stale: countStale(db, { now }),
    averageDaysToRead: averageDaysToRead(db),
  };
}

/**
 * 保存から読了までの平均日数。
 *
 * read_logs には source も savedAt も無いため items と結合する。
 * 物理削除されたアイテムは対象から外れる（履歴は残るが日数は計算できない）。
 */
function averageDaysToRead(db: YomiDatabase): number | null {
  const rows = db
    .select({ savedAt: items.savedAt, readAt: items.readAt })
    .from(items)
    .where(eq(items.status, 'read'))
    .all();

  const durations = rows
    .filter((r): r is { savedAt: Date; readAt: Date } => r.readAt !== null)
    .map((r) => daysBetween(r.savedAt, r.readAt));

  if (durations.length === 0) return null;
  return durations.reduce((a, b) => a + b, 0) / durations.length;
}

export type SourceReadRate = {
  source: Source;
  total: number;
  read: number;
  /** 0–1 */
  readRate: number;
};

/**
 * ソース別の読了率。read_logs は source を持たないため items から数える。
 *
 * アーカイブは「読まずに捨てた」ものなので母数に含める。物理削除された
 * アイテムは対象外（履歴からは source を復元できない）。
 */
export function readRateBySource(db: YomiDatabase): SourceReadRate[] {
  const rows = db
    .select({
      source: items.source,
      total: count(),
      read: sql<number>`SUM(CASE WHEN ${items.status} = 'read' THEN 1 ELSE 0 END)`,
    })
    .from(items)
    .groupBy(items.source)
    .all();

  return rows
    .map(({ source, total, read }) => ({
      source,
      total,
      read,
      readRate: total === 0 ? 0 : read / total,
    }))
    .sort((a, b) => b.readRate - a.readRate || a.source.localeCompare(b.source));
}

/** Today's Pick と通知の候補 */
export function pickCandidates(db: YomiDatabase, now = new Date()) {
  return db
    .select()
    .from(items)
    .where(and(eq(items.status, 'unread'), notSnoozed(now)))
    .orderBy(items.id)
    .all();
}

/**
 * 指定時刻より後に保存されたアイテムの source を返す。
 *
 * item_saved の分析イベントは Share Extension では送れない
 * （RevenueCat / PostHog を Extension に入れないため）。本体が起動したときに
 * read_logs から拾って送るために使う。
 */
export function listSavedSince(db: YomiDatabase, since: Date): { at: Date; source: Source }[] {
  return db
    .select({ at: readLogs.at, source: items.source })
    .from(readLogs)
    .innerJoin(items, eq(readLogs.itemId, items.id))
    .where(and(eq(readLogs.event, 'saved'), gt(readLogs.at, since)))
    .orderBy(readLogs.at)
    .all();
}

/** 現在の週の集計（Stats のヘッダ） */
export function thisWeek(db: YomiDatabase, now = new Date()): WeeklySummary {
  return weeklySummary(db, startOfWeek(now));
}

/** 先週の集計（先週比の表示に使う） */
export function lastWeek(db: YomiDatabase, now = new Date()): WeeklySummary {
  return weeklySummary(db, addDays(startOfWeek(now), -7));
}
