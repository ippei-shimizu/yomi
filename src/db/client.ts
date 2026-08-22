import { drizzle } from 'drizzle-orm/expo-sqlite';
import { Paths } from 'expo-file-system';
import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';

import { APP_GROUP } from './appGroup';
import * as schema from './schema';

export const DATABASE_NAME = 'yomi.db';

/**
 * App Group コンテナのパス。本体と Share Extension が同じ SQLite ファイルを
 * 開くために必要（docs/DesignDoc.md §3）。
 */
function sharedContainerUri(): string {
  const container = Paths.appleSharedContainers[APP_GROUP];
  if (!container) {
    // entitlements の設定漏れ。ここで落とさないと、既定のドキュメント
    // ディレクトリに別の DB が作られ、共有シートの保存が本体に反映されない
    // という原因の分かりにくい不具合になる。
    throw new Error(
      `App Group "${APP_GROUP}" のコンテナを解決できません。entitlements の設定を確認してください。`,
    );
  }
  return container.uri;
}

let cachedNativeDb: SQLiteDatabase | undefined;

/** App Group 上の yomi.db を開く。同一プロセス内では接続を使い回す */
export function openSharedSqlite(): SQLiteDatabase {
  cachedNativeDb ??= openDatabaseSync(
    DATABASE_NAME,
    // 外部キー制約は接続ごとに有効化が必要。item_tags の cascade 削除がこれに依存する
    { enableChangeListener: false },
    sharedContainerUri(),
  );
  return cachedNativeDb;
}

/**
 * SQLiteDatabase を Drizzle でラップする。
 *
 * 戻り値は expo-sqlite 固有の型のまま返す。マイグレータ
 * （drizzle-orm/expo-sqlite/migrator）がこの具象型を要求するため。
 * Repository 側はより広い YomiDatabase で受ける（types.ts を参照）。
 */
export function createDb(native: SQLiteDatabase) {
  native.execSync('PRAGMA foreign_keys = ON;');
  return drizzle(native, { schema });
}

export type Database = ReturnType<typeof createDb>;

/** アプリ / Extension から使う共有 DB */
export function openSharedDb(): Database {
  return createDb(openSharedSqlite());
}
