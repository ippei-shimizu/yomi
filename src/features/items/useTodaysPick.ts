import { useQuery } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { useDatabase } from '@/db/DatabaseProvider';
import { queryKeys } from '@/db/queryKeys';
import { statsRepo } from '@/db/repositories';
import type { Item } from '@/db/schema';
import { dateKeyOf, pickToday } from '@/domain/pick/pickToday';
import { clearStalePickNonces, getNumber, setNumber, storageKeys } from '@/lib/storage';

/**
 * Today's Pick（docs/DesignDoc.md §5.6）。
 *
 * 日付をシードにするので同日中は同じアイテムが返る。⟳ で nonce を
 * 増やして引き直す。nonce は MMKV に日付キーで保存し、日が変われば
 * 使われなくなる（古いキーは掃除する）。
 */
export function useTodaysPick(now = new Date()) {
  const db = useDatabase();
  const dateKey = dateKeyOf(now);
  const [nonce, setNonce] = useState(() => {
    clearStalePickNonces(dateKey);
    return getNumber(storageKeys.pickNonce(dateKey), 0);
  });

  const candidates = useQuery({
    queryKey: [...queryKeys.items, 'pickCandidates', dateKey],
    queryFn: (): Item[] => statsRepo.pickCandidates(db, now),
  });

  const reshuffle = useCallback(() => {
    setNonce((current) => {
      const next = current + 1;
      setNumber(storageKeys.pickNonce(dateKey), next);
      return next;
    });
  }, [dateKey]);

  return {
    item: pickToday(candidates.data ?? [], dateKey, nonce),
    isLoading: candidates.isLoading,
    reshuffle,
    /** 候補が 2 件以上ないと引き直す意味がない */
    canReshuffle: (candidates.data?.length ?? 0) > 1,
  };
}
