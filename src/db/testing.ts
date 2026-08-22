import path from 'node:path';

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

import * as schema from './schema';

const MIGRATIONS_FOLDER = path.resolve(import.meta.dirname, '../../drizzle');

/**
 * テスト用の in-memory DB。
 *
 * expo-sqlite はネイティブモジュールで Node では動かないため、同じ SQLite に
 * 対して better-sqlite3 ドライバを使う。
 *
 * スキーマは drizzle-kit が生成した実際のマイグレーションを drizzle 本来の
 * マイグレータで適用して作る。本番（expo-sqlite 版マイグレータ）とは
 * ドライバだけが違い、SQL と適用済みバージョンの管理方法は同一になる。
 */
export function createTestDb(): TestDatabase {
  const native = new Database(':memory:');
  native.pragma('foreign_keys = ON');

  const db = drizzle(native, { schema });
  migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  return db;
}

export type TestDatabase = ReturnType<typeof drizzle<typeof schema>>;

/** マイグレーションを再実行する。冪等性の検証に使う */
export function runMigrations(db: TestDatabase): void {
  migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
}
