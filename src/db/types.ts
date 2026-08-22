import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';

import type { Database } from './client';
import type * as schema from './schema';

/**
 * Repository が受け取る DB ハンドル。
 *
 * 本番は expo-sqlite、テストは better-sqlite3 と**ドライバが異なる**ため、
 * 両方が満たす基底型で受ける。Repository はドライバ固有の API を使わない。
 */
export type YomiDatabase = BaseSQLiteDatabase<'sync', unknown, typeof schema>;

/**
 * 本番の DB ハンドルが YomiDatabase を満たすことを型レベルで固定する。
 * 満たさなくなると Repository に渡せなくなるため、ここで気づけるようにする。
 */
export type AssertProductionDbIsCompatible = Database extends YomiDatabase ? true : never;

// 型が壊れたらここでコンパイルエラーになる
const _assertProductionDbIsCompatible: AssertProductionDbIsCompatible = true;
void _assertProductionDbIsCompatible;
