import { tagRepo } from '@/db/repositories';
import { items as itemsTable, itemTags, readLogs, tags as tagsTable } from '@/db/schema';
import type { Item } from '@/db/schema';
import type { YomiDatabase } from '@/db/types';

import { UTF8_BOM, toCsvRow } from './csv';

/**
 * エクスポート。
 *
 * **無料プランでも使える。** 端末内にしかデータが無いため、
 * バックアップ手段を課金の後ろに置かない。
 */

/** CSV の列 */
export const CSV_HEADER = [
  'title',
  'url',
  'source',
  'status',
  'tags',
  'saved_at',
  'read_at',
  'memo',
] as const;

function toIso(date: Date | null): string {
  return date === null ? '' : date.toISOString();
}

export function buildCsv(rows: readonly { item: Item; tags: string[] }[]): string {
  const lines = [toCsvRow(CSV_HEADER)];

  for (const { item, tags } of rows) {
    lines.push(
      toCsvRow([
        item.title,
        item.url,
        item.source,
        item.status,
        tags.join(' '),
        toIso(item.savedAt),
        toIso(item.readAt),
        item.memo,
      ]),
    );
  }

  // 末尾に改行を入れておくと、追記や結合をしても壊れない
  return `${UTF8_BOM}${lines.join('\n')}\n`;
}

export type ExportPayload = {
  version: 1;
  exportedAt: string;
  items: unknown[];
  tags: unknown[];
  itemTags: unknown[];
  readLogs: unknown[];
};

/**
 * JSON は**全フィールド**を出す。
 * `read_logs` も含めるのは、将来の復元で週次集計を失わないため。
 */
export function buildJson(db: YomiDatabase, exportedAt: Date): string {
  const payload: ExportPayload = {
    version: 1,
    exportedAt: exportedAt.toISOString(),
    items: db.select().from(itemsTable).all(),
    tags: db.select().from(tagsTable).all(),
    itemTags: db.select().from(itemTags).all(),
    readLogs: db.select().from(readLogs).all(),
  };

  return JSON.stringify(payload, null, 2);
}

/**
 * CSV を組み立てる。
 *
 * アイテムを 1 回引き、そのタグを `listForItems` で一括取得する。
 * アイテムごとにタグを引くと N+1 になる。
 */
export function exportCsv(db: YomiDatabase): string {
  const rows = db.select().from(itemsTable).orderBy(itemsTable.savedAt).all();
  const tagsByItem = tagRepo.listForItems(
    db,
    rows.map((item) => item.id),
  );

  return buildCsv(
    rows.map((item) => ({
      item,
      tags: (tagsByItem.get(item.id) ?? []).map((tag) => tag.name),
    })),
  );
}
