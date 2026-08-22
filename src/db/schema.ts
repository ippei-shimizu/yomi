import { sql } from 'drizzle-orm';
import { index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { SOURCES } from '@/domain/url';

/** アイテムの状態。この 3 つから増やさない */
export const ITEM_STATUSES = ['unread', 'read', 'archived'] as const;
export type ItemStatus = (typeof ITEM_STATUSES)[number];

/** メタデータ取得の進捗 */
export const META_STATUSES = ['pending', 'done', 'failed'] as const;
export type MetaStatus = (typeof META_STATUSES)[number];

/** read_logs に記録するイベント。items の更新で失われる履歴を残す */
export const READ_LOG_EVENTS = ['saved', 'read', 'archived', 'unread'] as const;
export type ReadLogEvent = (typeof READ_LOG_EVENTS)[number];

export const items = sqliteTable(
  'items',
  {
    /** uuid v7。時系列でソートできる */
    id: text('id').primaryKey(),
    /** 正規化後 URL */
    url: text('url').notNull(),
    originalUrl: text('original_url').notNull(),
    /** sha256(url)。重複検知の唯一の判断材料 */
    urlHash: text('url_hash').notNull().unique(),
    source: text('source', { enum: SOURCES }).notNull(),
    title: text('title'),
    description: text('description'),
    thumbnailUrl: text('thumbnail_url'),
    siteName: text('site_name'),
    author: text('author'),
    status: text('status', { enum: ITEM_STATUSES }).notNull().default('unread'),
    metaStatus: text('meta_status', { enum: META_STATUSES }).notNull().default('pending'),
    metaRetryCount: integer('meta_retry_count').notNull().default(0),
    memo: text('memo'),
    /** スヌーズ中でも status は unread のまま。ホームの並びで末尾に送る */
    snoozedUntil: integer('snoozed_until', { mode: 'timestamp' }),
    savedAt: integer('saved_at', { mode: 'timestamp' }).notNull(),
    readAt: integer('read_at', { mode: 'timestamp' }),
    archivedAt: integer('archived_at', { mode: 'timestamp' }),
    /** 将来の iCloud 同期への移行余地のため全テーブルに持たせる */
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (t) => [
    index('idx_items_status_saved').on(t.status, t.savedAt),
    index('idx_items_meta_status').on(t.metaStatus),
  ],
);

export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const itemTags = sqliteTable(
  'item_tags',
  {
    itemId: text('item_id')
      .notNull()
      .references(() => items.id, { onDelete: 'cascade' }),
    tagId: text('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [primaryKey({ columns: [t.itemId, t.tagId] })],
);

/**
 * 週次集計用。items の更新で失われる履歴（読了→未読に戻す等）を残す。
 * Stats はこのテーブルだけから集計する。
 */
export const readLogs = sqliteTable(
  'read_logs',
  {
    id: text('id').primaryKey(),
    /**
     * items への外部キーは張らない。アイテムを物理削除しても、その週に
     * 読んだという事実は集計に残す必要があるため。
     */
    itemId: text('item_id').notNull(),
    event: text('event', { enum: READ_LOG_EVENTS }).notNull(),
    at: integer('at', { mode: 'timestamp' }).notNull(),
  },
  (t) => [index('idx_read_logs_at').on(t.at)],
);

export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;
export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;
export type ItemTag = typeof itemTags.$inferSelect;
export type ReadLog = typeof readLogs.$inferSelect;
export type NewReadLog = typeof readLogs.$inferInsert;
