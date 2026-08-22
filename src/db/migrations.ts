import { useMigrations as useDrizzleMigrations } from 'drizzle-orm/expo-sqlite/migrator';

// drizzle-kit generate が出力する。babel-plugin-inline-import により
// .sql の中身が文字列として埋め込まれる（babel.config.js / metro.config.js を参照）。
import migrations from '../../drizzle/migrations';

import type { Database } from './client';

/**
 * 未適用のマイグレーションを起動時に適用する。
 * drizzle 側で適用済みバージョンを管理するため冪等。
 */
export function useMigrations(db: Database) {
  return useDrizzleMigrations(db, migrations);
}
