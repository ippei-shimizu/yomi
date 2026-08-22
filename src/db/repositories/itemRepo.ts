import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  inArray,
  isNull,
  lt,
  lte,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';

import { MS_PER_DAY } from '@/domain/date/week';

import { newId } from '../id';
import { items, type Item, type ItemStatus, type NewItem } from '../schema';
import type { YomiDatabase } from '../types';
import { appendReadLog } from './readLog';

/** 無料プランの保存上限。archived は数えない */
export const FREE_PLAN_ITEM_LIMIT = 50;

/** 「放置」と見なす日数 */
export const STALE_THRESHOLD_DAYS = 30;

/** メタ取得のリトライ上限 */
export const META_MAX_RETRY = 3;

export type UnreadOrder = 'oldest' | 'newest';

export type InsertItemInput = Omit<NewItem, 'id' | 'savedAt' | 'updatedAt' | 'status'> & {
  id?: string;
};

/**
 * スヌーズ中（snoozedUntil > now）かどうか。1 = スヌーズ中で、並びの末尾に送る。
 *
 * 比較は必ず drizzle の演算子（gt など）を通す。sql`` に Date をそのまま
 * 埋め込むとカラムの timestamp モードによる変換が効かず、実行時に
 * 「SQLite3 can only bind numbers, strings, ...」で落ちる。
 */
function snoozedFirstOrder(now: Date): SQL {
  return sql`CASE WHEN ${isSnoozed(now)} THEN 1 ELSE 0 END`;
}

function isSnoozed(now: Date): SQL {
  return and(sql`${items.snoozedUntil} IS NOT NULL`, gt(items.snoozedUntil, now))!;
}

/** スヌーズが明けている（= 通知や Today's Pick の候補になる）条件 */
export function notSnoozed(now: Date): SQL {
  return or(isNull(items.snoozedUntil), lte(items.snoozedUntil, now))!;
}

export function insert(db: YomiDatabase, input: InsertItemInput, now = new Date()): Item {
  const row: NewItem = {
    ...input,
    id: input.id ?? newId(),
    status: 'unread',
    savedAt: now,
    updatedAt: now,
  };

  return db.transaction((tx) => {
    const inserted = tx.insert(items).values(row).returning().get();
    appendReadLog(tx, inserted.id, 'saved', now);
    return inserted;
  });
}

export function existsByHash(db: YomiDatabase, urlHash: string): boolean {
  return (
    db.select({ id: items.id }).from(items).where(eq(items.urlHash, urlHash)).get() !== undefined
  );
}

export function findById(db: YomiDatabase, id: string): Item | undefined {
  return db.select().from(items).where(eq(items.id, id)).get();
}

export function findByHash(db: YomiDatabase, urlHash: string): Item | undefined {
  return db.select().from(items).where(eq(items.urlHash, urlHash)).get();
}

/** 既存の url_hash を一括で引く。一括インポートの重複判定に使う（N+1 を避ける） */
export function findExistingHashes(db: YomiDatabase, urlHashes: string[]): Set<string> {
  if (urlHashes.length === 0) return new Set();
  const rows = db
    .select({ urlHash: items.urlHash })
    .from(items)
    .where(inArray(items.urlHash, urlHashes))
    .all();
  return new Set(rows.map((r) => r.urlHash));
}

/**
 * 状態以外の項目を更新する。状態の変更は markRead / archive / restoreToUnread を使う
 * （read_logs への追記が必要なため）。
 */
export function update(
  db: YomiDatabase,
  id: string,
  patch: Partial<Omit<Item, 'id' | 'status' | 'savedAt' | 'updatedAt'>>,
  now = new Date(),
): void {
  db.update(items)
    .set({ ...patch, updatedAt: now })
    .where(eq(items.id, id))
    .run();
}

/**
 * 物理削除。archived からのみ。
 * read_logs は外部キーを持たないため履歴は残る。
 *
 * @returns 削除できたら true。対象が archived でなければ false
 */
export function remove(db: YomiDatabase, id: string): boolean {
  const result = db
    .delete(items)
    .where(and(eq(items.id, id), eq(items.status, 'archived')))
    .returning({ id: items.id })
    .all();
  return result.length > 0;
}

/**
 * 複数件を 1 トランザクションで物理削除する。archived のもののみ対象。
 *
 * @returns 実際に削除された件数
 */
export function removeMany(db: YomiDatabase, ids: string[]): number {
  if (ids.length === 0) return 0;

  return db.transaction((tx) => {
    const deleted = tx
      .delete(items)
      .where(and(inArray(items.id, ids), eq(items.status, 'archived')))
      .returning({ id: items.id })
      .all();
    return deleted.length;
  });
}

/**
 * Home の未読キュー。
 * スヌーズ中のものを末尾に送り、それ以外は保存日順（既定は古い順）。
 */
export function listUnread(
  db: YomiDatabase,
  { order = 'oldest', now = new Date() }: { order?: UnreadOrder; now?: Date } = {},
): Item[] {
  return db
    .select()
    .from(items)
    .where(eq(items.status, 'unread'))
    .orderBy(snoozedFirstOrder(now), order === 'oldest' ? asc(items.savedAt) : desc(items.savedAt))
    .all();
}

export function listByStatus(db: YomiDatabase, status: Exclude<ItemStatus, 'unread'>): Item[] {
  // Library は月ごとのセクションで表示するため、状態になった日時の新しい順
  const orderColumn = status === 'read' ? items.readAt : items.archivedAt;
  return db
    .select()
    .from(items)
    .where(eq(items.status, status))
    .orderBy(desc(orderColumn), desc(items.savedAt))
    .all();
}

/**
 * 放置アイテム。
 * スヌーズ中のものは「意図的に先送りした」ものなので含めない。
 * Home の放置バナーの件数もこれと一致させる。
 */
export function listStale(
  db: YomiDatabase,
  {
    now = new Date(),
    thresholdDays = STALE_THRESHOLD_DAYS,
  }: { now?: Date; thresholdDays?: number } = {},
): Item[] {
  const threshold = new Date(now.getTime() - thresholdDays * MS_PER_DAY);
  return db
    .select()
    .from(items)
    .where(and(eq(items.status, 'unread'), lte(items.savedAt, threshold), notSnoozed(now)))
    .orderBy(asc(items.savedAt))
    .all();
}

export function countStale(db: YomiDatabase, options: { now?: Date } = {}): number {
  return listStale(db, options).length;
}

/** 無料プランの上限判定に使う件数。archived は含めない */
export function countForLimit(db: YomiDatabase): number {
  const row = db
    .select({ value: count() })
    .from(items)
    .where(inArray(items.status, ['unread', 'read']))
    .get();
  return row?.value ?? 0;
}

export function canSave(db: YomiDatabase, isPro: boolean): boolean {
  return isPro || countForLimit(db) < FREE_PLAN_ITEM_LIMIT;
}

/** MetaFetchWorker の対象 */
export function listPendingMeta(
  db: YomiDatabase,
  limit: number,
  maxRetry = META_MAX_RETRY,
): Item[] {
  return db
    .select()
    .from(items)
    .where(and(eq(items.metaStatus, 'pending'), lt(items.metaRetryCount, maxRetry)))
    .orderBy(asc(items.savedAt))
    .limit(limit)
    .all();
}

/** メタ取得に成功したときの反映 */
export function applyMetadata(
  db: YomiDatabase,
  id: string,
  metadata: Partial<Pick<Item, 'title' | 'description' | 'thumbnailUrl' | 'siteName' | 'author'>>,
  now = new Date(),
): void {
  db.update(items)
    .set({ ...metadata, metaStatus: 'done', updatedAt: now })
    .where(eq(items.id, id))
    .run();
}

/**
 * メタ取得に失敗したときのリトライ加算。
 * META_MAX_RETRY 回で failed にして、それ以上は対象にしない。
 */
export function recordMetaFailure(db: YomiDatabase, id: string, now = new Date()): void {
  db.transaction((tx) => {
    const current = tx
      .select({ metaRetryCount: items.metaRetryCount })
      .from(items)
      .where(eq(items.id, id))
      .get();
    if (!current) return;

    const nextCount = current.metaRetryCount + 1;
    tx.update(items)
      .set({
        metaRetryCount: nextCount,
        metaStatus: nextCount >= META_MAX_RETRY ? 'failed' : 'pending',
        updatedAt: now,
      })
      .where(eq(items.id, id))
      .run();
  });
}

/** 詳細画面の「メタデータを再取得」。リトライ回数をリセットして対象に戻す */
export function resetMetaStatus(db: YomiDatabase, id: string, now = new Date()): void {
  db.update(items)
    .set({ metaStatus: 'pending', metaRetryCount: 0, updatedAt: now })
    .where(eq(items.id, id))
    .run();
}

/**
 * 短縮 URL の展開後に url / url_hash を更新する。
 *
 * 展開先が既に保存済みだった場合は統合する。**古い方（先に保存された方）を残し**、
 * 新しい方を削除する。保存日が古い方がユーザーの「溜めている」実感に近く、
 * 未読キューの並びも保たれるため。
 *
 * @returns 統合が起きて自身が削除されたら 'merged'、更新できたら 'updated'
 */
export function applyExpandedUrl(
  db: YomiDatabase,
  id: string,
  expandedUrl: string,
  expandedHash: string,
  now = new Date(),
): 'updated' | 'merged' {
  return db.transaction((tx) => {
    const existing = tx
      .select({ id: items.id, savedAt: items.savedAt })
      .from(items)
      .where(eq(items.urlHash, expandedHash))
      .get();

    if (existing && existing.id !== id) {
      // 展開先が既にある。新しい方（この id）を捨てて古い方に寄せる
      tx.delete(items).where(eq(items.id, id)).run();
      return 'merged';
    }

    tx.update(items)
      .set({ url: expandedUrl, urlHash: expandedHash, updatedAt: now })
      .where(eq(items.id, id))
      .run();
    return 'updated';
  });
}

export function markRead(
  db: YomiDatabase,
  id: string,
  { memo, now = new Date() }: { memo?: string; now?: Date } = {},
): void {
  db.transaction((tx) => {
    tx.update(items)
      .set({
        status: 'read',
        readAt: now,
        updatedAt: now,
        // スヌーズは読了で意味を失うので解除する
        snoozedUntil: null,
        ...(memo === undefined ? {} : { memo }),
      })
      .where(eq(items.id, id))
      .run();
    appendReadLog(tx, id, 'read', now);
  });
}

export function archive(db: YomiDatabase, id: string, now = new Date()): void {
  db.transaction((tx) => {
    tx.update(items)
      .set({ status: 'archived', archivedAt: now, updatedAt: now, snoozedUntil: null })
      .where(eq(items.id, id))
      .run();
    appendReadLog(tx, id, 'archived', now);
  });
}

/**
 * 複数件を 1 トランザクションで保存する（URL 一括インポート）。
 * 途中で失敗したら 1 件も入らない。
 */
export function insertMany(db: YomiDatabase, inputs: InsertItemInput[], now = new Date()): number {
  if (inputs.length === 0) return 0;

  return db.transaction((tx) => {
    for (const input of inputs) {
      const id = input.id ?? newId();
      tx.insert(items)
        .values({ ...input, id, status: 'unread', savedAt: now, updatedAt: now })
        .run();
      appendReadLog(tx, id, 'saved', now);
    }
    return inputs.length;
  });
}

/** 複数件を 1 トランザクションでアーカイブする（放置整理の一括操作） */
export function archiveMany(db: YomiDatabase, ids: string[], now = new Date()): void {
  if (ids.length === 0) return;
  db.transaction((tx) => {
    tx.update(items)
      .set({ status: 'archived', archivedAt: now, updatedAt: now, snoozedUntil: null })
      .where(inArray(items.id, ids))
      .run();
    for (const id of ids) appendReadLog(tx, id, 'archived', now);
  });
}

export function restoreToUnread(db: YomiDatabase, id: string, now = new Date()): void {
  db.transaction((tx) => {
    tx.update(items)
      .set({ status: 'unread', readAt: null, archivedAt: null, updatedAt: now })
      .where(eq(items.id, id))
      .run();
    appendReadLog(tx, id, 'unread', now);
  });
}

/**
 * 「あとで」。status は unread のまま snoozedUntil を立てるだけで、
 * 状態は変わらないので read_logs には積まない。
 */
export function snooze(db: YomiDatabase, id: string, days: number, now = new Date()): void {
  update(db, id, { snoozedUntil: new Date(now.getTime() + days * MS_PER_DAY) }, now);
}

/** 「今週読む」。savedAt を now に更新して Home の上位に戻す */
export function bumpToNow(db: YomiDatabase, ids: string[], now = new Date()): void {
  if (ids.length === 0) return;
  db.update(items)
    .set({ savedAt: now, updatedAt: now, snoozedUntil: null })
    .where(inArray(items.id, ids))
    .run();
}
