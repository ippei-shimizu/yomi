import { and, eq, inArray, or, sql, type SQL } from 'drizzle-orm';

import type { Source } from '@/domain/url';

import { items, itemTags, type Item, type ItemStatus } from '../schema';
import type { YomiDatabase } from '../types';

/**
 * 検索とフィルタ。
 *
 * 無料プランは title の LIKE のみ。Pro は FTS5 で memo と description も対象。
 */

export type SearchFilter = {
  query?: string;
  statuses?: ItemStatus[];
  sources?: Source[];
  tagIds?: string[];
  /** Pro なら memo / description も検索対象にする */
  includeMemo?: boolean;
};

/**
 * FTS5 の trigram トークナイザが扱える最小文字数。
 * これ未満のクエリは MATCH で 0 件になるため LIKE にフォールバックする。
 */
export const MIN_FTS_QUERY_LENGTH = 3;

/**
 * FTS5 の MATCH に渡す文字列を安全にする。
 *
 * MATCH の構文は `"` `*` `:` `^` `-` `AND` `OR` `NEAR` などをメタ文字として
 * 解釈する。ユーザー入力を素通しすると構文エラーで落ちるうえ、意図しない
 * 検索になる。**各トークンを二重引用符で囲んだフレーズとして扱う**
 * （引用符自体は 2 個重ねてエスケープする）。
 */
export function toMatchQuery(input: string): string | null {
  const tokens = input
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 0)
    .map((token) => `"${token.replace(/"/g, '""')}"`);

  return tokens.length > 0 ? tokens.join(' ') : null;
}

/** LIKE のワイルドカードをエスケープする。`%` `_` を含む検索語で全件ヒットさせない */
export function escapeLike(input: string): string {
  return input.replace(/[\\%_]/g, (char) => `\\${char}`);
}

function textCondition(query: string, includeMemo: boolean): SQL | undefined {
  const trimmed = query.trim();
  if (trimmed.length === 0) return undefined;

  const pattern = `%${escapeLike(trimmed)}%`;
  const title = sql`${items.title} LIKE ${pattern} ESCAPE '\\'`;
  if (!includeMemo) return title;

  return or(
    title,
    sql`${items.memo} LIKE ${pattern} ESCAPE '\\'`,
    sql`${items.description} LIKE ${pattern} ESCAPE '\\'`,
  );
}

/** FTS5 を使うべきクエリか。短すぎる語は trigram で引けない */
export function shouldUseFts(query: string, includeMemo: boolean): boolean {
  return includeMemo && query.trim().length >= MIN_FTS_QUERY_LENGTH;
}

/**
 * FTS5（items_fts）で該当する rowid を引く条件。
 *
 * 外部コンテンツテーブルなので rowid が items のものと一致する。
 */
function ftsCondition(query: string): SQL | undefined {
  const match = toMatchQuery(query);
  if (match === null) return undefined;
  return sql`${items.id} IN (SELECT i.id FROM items i JOIN items_fts f ON f.rowid = i.rowid WHERE items_fts MATCH ${match})`;
}

/**
 * 絞り込み。
 *
 * 無料プランは title の LIKE のみ。Pro は 3 文字以上なら FTS5、
 * それ未満は LIKE（trigram が短い語を扱えないため）。
 */
export function search(db: YomiDatabase, filter: SearchFilter): Item[] {
  const conditions: (SQL | undefined)[] = [];
  const includeMemo = filter.includeMemo ?? false;

  if (filter.query !== undefined && filter.query.trim().length > 0) {
    conditions.push(
      shouldUseFts(filter.query, includeMemo)
        ? ftsCondition(filter.query)
        : textCondition(filter.query, includeMemo),
    );
  }
  if (filter.statuses !== undefined && filter.statuses.length > 0) {
    conditions.push(inArray(items.status, filter.statuses));
  }
  if (filter.sources !== undefined && filter.sources.length > 0) {
    conditions.push(inArray(items.source, filter.sources));
  }
  if (filter.tagIds !== undefined && filter.tagIds.length > 0) {
    // 指定タグのいずれかが付いているアイテム
    conditions.push(
      sql`EXISTS (SELECT 1 FROM ${itemTags} WHERE ${itemTags.itemId} = ${items.id} AND ${inArray(itemTags.tagId, filter.tagIds)})`,
    );
  }

  const defined = conditions.filter((condition): condition is SQL => condition !== undefined);

  return db
    .select()
    .from(items)
    .where(defined.length > 0 ? and(...defined) : undefined)
    .orderBy(items.savedAt)
    .all();
}

/** ソース別の件数。フィルタチップの表示に使う */
export function countBySource(
  db: YomiDatabase,
  status: ItemStatus,
): { source: Source; count: number }[] {
  return db
    .select({ source: items.source, count: sql<number>`COUNT(*)` })
    .from(items)
    .where(eq(items.status, status))
    .groupBy(items.source)
    .all();
}
