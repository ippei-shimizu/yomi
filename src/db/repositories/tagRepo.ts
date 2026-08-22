import { and, count, desc, eq, inArray, sql } from 'drizzle-orm';

import { newId } from '../id';
import { itemTags, tags, type Tag } from '../schema';
import type { YomiDatabase } from '../types';

/** 無料プランのタグ上限（docs/PRD.md §7.5） */
export const FREE_PLAN_TAG_LIMIT = 3;

/** Share Extension のタグチップに出す件数（docs/Screens.md X01） */
export const RECENT_TAG_LIMIT = 5;

export function list(db: YomiDatabase): Tag[] {
  return db.select().from(tags).orderBy(tags.name).all();
}

export function countAll(db: YomiDatabase): number {
  return db.select({ value: count() }).from(tags).get()?.value ?? 0;
}

export function canCreate(db: YomiDatabase, isPro: boolean): boolean {
  return isPro || countAll(db) < FREE_PLAN_TAG_LIMIT;
}

export function findByName(db: YomiDatabase, name: string): Tag | undefined {
  return db.select().from(tags).where(eq(tags.name, name)).get();
}

export function create(db: YomiDatabase, name: string, now = new Date()): Tag {
  return db
    .insert(tags)
    .values({ id: newId(), name, createdAt: now, updatedAt: now })
    .returning()
    .get();
}

export function rename(db: YomiDatabase, id: string, name: string, now = new Date()): void {
  db.update(tags).set({ name, updatedAt: now }).where(eq(tags.id, id)).run();
}

/** タグを消すと item_tags も cascade で消える。アイテム自体は残る */
export function remove(db: YomiDatabase, id: string): void {
  db.delete(tags).where(eq(tags.id, id)).run();
}

export function attach(db: YomiDatabase, itemId: string, tagId: string, now = new Date()): void {
  db.insert(itemTags)
    .values({ itemId, tagId, createdAt: now })
    // 同じタグを二度付けても失敗させない（UI 側で握りつぶす必要をなくす）
    .onConflictDoNothing()
    .run();
}

export function detach(db: YomiDatabase, itemId: string, tagId: string): void {
  db.delete(itemTags)
    .where(and(eq(itemTags.itemId, itemId), eq(itemTags.tagId, tagId)))
    .run();
}

export function listForItem(db: YomiDatabase, itemId: string): Tag[] {
  return db
    .select({ id: tags.id, name: tags.name, createdAt: tags.createdAt, updatedAt: tags.updatedAt })
    .from(itemTags)
    .innerJoin(tags, eq(itemTags.tagId, tags.id))
    .where(eq(itemTags.itemId, itemId))
    .orderBy(tags.name)
    .all();
}

/**
 * 複数アイテムのタグをまとめて引く。リスト描画で 1 行ずつ引くと N+1 になるため
 * （docs/PRD.md §8 の 5,000 件 / 500ms 要件）。
 */
export function listForItems(db: YomiDatabase, itemIds: string[]): Map<string, Tag[]> {
  const result = new Map<string, Tag[]>();
  if (itemIds.length === 0) return result;

  const rows = db
    .select({
      itemId: itemTags.itemId,
      id: tags.id,
      name: tags.name,
      createdAt: tags.createdAt,
      updatedAt: tags.updatedAt,
    })
    .from(itemTags)
    .innerJoin(tags, eq(itemTags.tagId, tags.id))
    .where(inArray(itemTags.itemId, itemIds))
    .orderBy(tags.name)
    .all();

  for (const { itemId, ...tag } of rows) {
    const list = result.get(itemId);
    if (list) list.push(tag);
    else result.set(itemId, [tag]);
  }
  return result;
}

/** 直近で使われたタグ。Share Extension のチップに出す */
export function listRecentlyUsed(db: YomiDatabase, limit = RECENT_TAG_LIMIT): Tag[] {
  return db
    .select({ id: tags.id, name: tags.name, createdAt: tags.createdAt, updatedAt: tags.updatedAt })
    .from(itemTags)
    .innerJoin(tags, eq(itemTags.tagId, tags.id))
    .groupBy(tags.id)
    .orderBy(desc(sql`MAX(${itemTags.createdAt})`))
    .limit(limit)
    .all();
}

export type TagWithUsage = Tag & { usageCount: number };

/** タグ管理画面用。使用件数を 1 クエリで取る */
export function listWithUsage(db: YomiDatabase): TagWithUsage[] {
  return db
    .select({
      id: tags.id,
      name: tags.name,
      createdAt: tags.createdAt,
      updatedAt: tags.updatedAt,
      usageCount: count(itemTags.itemId),
    })
    .from(tags)
    .leftJoin(itemTags, eq(itemTags.tagId, tags.id))
    .groupBy(tags.id)
    .orderBy(tags.name)
    .all();
}
