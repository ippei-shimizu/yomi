import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';

import { openSharedDb } from '@/db/client';

import { runMetaFetchWorker } from './worker';

/**
 * バックグラウンドでのメタ取得（docs/DesignDoc.md §5.2）。
 *
 * 実行間隔は OS の裁量で、最短でも 15 分。確実に走る保証は無いため、
 * 本体の foreground 復帰時にも同じ Worker を回す（useMetaFetchWorker）。
 */
export const META_FETCH_TASK = 'yomi.meta-fetch';

TaskManager.defineTask(META_FETCH_TASK, async () => {
  try {
    // 対象が 0 件でも「正常に確認して何も無かった」ので Success を返す。
    // Failed を返すと OS が実行頻度を下げてしまう。
    await runMetaFetchWorker(openSharedDb());
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    // 例外を投げると OS が以後のスケジュールを止めることがあるため握る
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function registerMetaFetchTask(): Promise<void> {
  const status = await BackgroundTask.getStatusAsync();
  if (status === BackgroundTask.BackgroundTaskStatus.Restricted) return;

  const registered = await TaskManager.isTaskRegisteredAsync(META_FETCH_TASK);
  if (registered) return;

  await BackgroundTask.registerTaskAsync(META_FETCH_TASK, { minimumInterval: 15 });
}
