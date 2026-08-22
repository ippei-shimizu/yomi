import { createContext, use, useMemo, type ReactNode } from 'react';

import { openSharedDb } from './client';
import type { YomiDatabase } from './types';

/**
 * DB ハンドルを配る。画面は Repository を直接呼ばず、features/ の
 * フック経由で使う。
 *
 * テストや Storybook から別のドライバを差し込めるよう Provider にしてある。
 */
const DatabaseContext = createContext<YomiDatabase | null>(null);

export function DatabaseProvider({ db, children }: { db?: YomiDatabase; children: ReactNode }) {
  const value = useMemo(() => db ?? openSharedDb(), [db]);
  return <DatabaseContext value={value}>{children}</DatabaseContext>;
}

export function useDatabase(): YomiDatabase {
  const db = use(DatabaseContext);
  if (!db) throw new Error('DatabaseProvider の外で useDatabase を呼んでいます。');
  return db;
}
