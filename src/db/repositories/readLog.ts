import { newId } from '../id';
import { readLogs, type ReadLogEvent } from '../schema';
import type { YomiDatabase } from '../types';

/**
 * 状態変更の履歴を積む。Stats はこのテーブルだけから集計するため
 * （docs/DesignDoc.md §4.1 / §6）、状態を変える書き込みでは必ず呼ぶ。
 *
 * Repository の内側から呼び、画面側には任せない。
 */
export function appendReadLog(
  db: YomiDatabase,
  itemId: string,
  event: ReadLogEvent,
  at: Date,
): void {
  db.insert(readLogs).values({ id: newId(), itemId, event, at }).run();
}
