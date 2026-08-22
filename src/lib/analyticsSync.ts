import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';

import { statsRepo } from '@/db/repositories';
import type { YomiDatabase } from '@/db/types';

import { capture } from './analytics';
import { getNumber, setNumber } from './storage';

/**
 * item_saved の送信。
 *
 * 保存は Share Extension で起きるが、そこには PostHog を入れられない
 * 本体が起動したときに read_logs を見て、
 * 前回送った時刻より後の `saved` を送る。
 *
 * 送信済みの位置を MMKV に持つので、二重送信も送り漏れも起きない。
 */
const WATERMARK_KEY = 'analytics:lastSavedLogAt';

export function syncSavedEvents(db: YomiDatabase): number {
  const since = new Date(getNumber(WATERMARK_KEY, 0));
  const saved = statsRepo.listSavedSince(db, since);
  if (saved.length === 0) return 0;

  for (const row of saved) {
    // 送るのは source だけ。URL・タイトルは送らない
    capture({ name: 'item_saved', properties: { source: row.source } });
  }

  const latest = saved.at(-1);
  if (latest) setNumber(WATERMARK_KEY, latest.at.getTime());
  return saved.length;
}

/** 起動時と foreground 復帰時に送る */
export function useAnalyticsSync(db: YomiDatabase): void {
  const sync = useCallback(() => {
    try {
      syncSavedEvents(db);
    } catch {
      // 分析の失敗でアプリを止めない
    }
  }, [db]);

  useEffect(() => {
    sync();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') sync();
    });
    return () => subscription.remove();
  }, [sync]);
}
