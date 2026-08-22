import { useState, type ReactNode } from 'react';

import { openSharedDb } from '@/db/client';
import { DatabaseProvider } from '@/db/DatabaseProvider';
import { useMigrations } from '@/db/migrations';
import { FullScreenMessage } from '@/ui';

/**
 * マイグレーションを適用してから子を描画する。
 *
 * 適用前に描画すると、存在しないテーブルを引いて落ちる。
 * useMigrations は expo-sqlite 固有の型を要求するため、
 * ここだけ openSharedDb() の具象型をそのまま使う。
 */
export function MigrationGate({ children }: { children: ReactNode }) {
  const [db] = useState(openSharedDb);
  const { success, error } = useMigrations(db);

  if (error !== undefined) {
    // マイグレーションに失敗したらデータを触らせない。
    // ここで先に進むと不整合なスキーマに書き込むことになる。
    return <FullScreenMessage message="データベースの準備に失敗しました" />;
  }
  if (!success) return null;

  return <DatabaseProvider db={db}>{children}</DatabaseProvider>;
}
