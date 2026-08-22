import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import type { YomiDatabase } from '@/db/types';
import { invalidationKeys } from '@/db/queryKeys';

import { IMPORT_BATCH_SIZE, runMetaFetchWorker, type RunOptions } from './worker';

/**
 * 本体の foreground 復帰時に Worker を回す。
 *
 * 取得が終わったらリストを更新する必要があるため、React Query の
 * invalidate をここで行う。
 */
export function useMetaFetchWorker(db: YomiDatabase) {
  const queryClient = useQueryClient();
  // 前回の実行が終わる前に再度 foreground に戻っても二重に走らせない
  const running = useRef(false);

  const run = useCallback(
    async (options: RunOptions = {}) => {
      if (running.current) return;
      running.current = true;

      try {
        const result = await runMetaFetchWorker(db, options);
        if (result.succeeded > 0 || result.merged > 0) {
          for (const key of invalidationKeys.afterItemWrite) {
            await queryClient.invalidateQueries({ queryKey: key });
          }
        }
      } finally {
        running.current = false;
      }
    },
    [db, queryClient],
  );

  useEffect(() => {
    void run();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void run();
    });
    return () => subscription.remove();
  }, [run]);

  /** URL 一括インポート直後に、その回だけ件数を引き上げて即時実行する */
  const runAfterImport = useCallback(() => run({ batchSize: IMPORT_BATCH_SIZE }), [run]);

  return { run, runAfterImport };
}
