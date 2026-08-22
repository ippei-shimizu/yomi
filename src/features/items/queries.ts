import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useDatabase } from '@/db/DatabaseProvider';
import { daysBetween } from '@/domain/date/week';
import { capture } from '@/lib/analytics';
import { invalidationKeys, queryKeys } from '@/db/queryKeys';
import { itemRepo, tagRepo } from '@/db/repositories';
import type { Item, Tag } from '@/db/schema';

/**
 * 画面から使う DB アクセス。
 * 画面は Repository を直接呼ばず、必ずこのフック経由にする。
 */

export type UnreadOrder = itemRepo.UnreadOrder;

export function useUnreadItems(order: UnreadOrder) {
  const db = useDatabase();
  return useQuery({
    queryKey: queryKeys.itemsByStatus('unread', order),
    queryFn: () => itemRepo.listUnread(db, { order }),
  });
}

export function useLibraryItems(status: 'read' | 'archived') {
  const db = useDatabase();
  return useQuery({
    queryKey: queryKeys.itemsByStatus(status),
    queryFn: () => itemRepo.listByStatus(db, status),
  });
}

export function useStaleItems() {
  const db = useDatabase();
  return useQuery({ queryKey: queryKeys.stale, queryFn: () => itemRepo.listStale(db) });
}

export function useItem(id: string) {
  const db = useDatabase();
  return useQuery({
    queryKey: queryKeys.item(id),
    queryFn: () => itemRepo.findById(db, id) ?? null,
  });
}

/** 複数アイテムのタグをまとめて引く。行ごとに引くと N+1 になる */
export function useTagsForItems(items: Item[] | undefined) {
  const db = useDatabase();
  const ids = items?.map((item) => item.id) ?? [];
  return useQuery({
    queryKey: [...queryKeys.tags, 'forItems', ids],
    queryFn: (): Map<string, Tag[]> => tagRepo.listForItems(db, ids),
    enabled: ids.length > 0,
  });
}

/** 書き込み後に items と stats の両方を無効化する（片方だけだと Stats が古いまま残る） */
export function useInvalidateItems() {
  const queryClient = useQueryClient();
  return useCallback(async () => {
    await Promise.all(
      invalidationKeys.afterItemWrite.map((key) =>
        queryClient.invalidateQueries({ queryKey: key }),
      ),
    );
  }, [queryClient]);
}

export type ItemAction =
  | { type: 'read'; id: string; memo?: string }
  | { type: 'archive'; id: string }
  | { type: 'restore'; id: string }
  | { type: 'snooze'; id: string; days: number }
  | { type: 'delete'; id: string }
  | { type: 'archiveMany'; ids: string[] }
  | { type: 'deleteMany'; ids: string[] }
  | { type: 'bumpToNow'; ids: string[] };

export function useItemActions() {
  const db = useDatabase();
  const invalidate = useInvalidateItems();

  return useMutation({
    mutationFn: async (action: ItemAction) => {
      switch (action.type) {
        case 'read': {
          const item = itemRepo.findById(db, action.id);
          itemRepo.markRead(db, action.id, { memo: action.memo });
          // 送るのは日数だけ。URL・タイトルは送らない
          if (item) {
            capture({
              name: 'item_read',
              properties: { days_since_saved: daysBetween(item.savedAt, new Date()) },
            });
          }
          return;
        }
        case 'archive':
          capture({ name: 'item_archived' });
          return itemRepo.archive(db, action.id);
        case 'restore':
          return itemRepo.restoreToUnread(db, action.id);
        case 'snooze':
          return itemRepo.snooze(db, action.id, action.days);
        case 'delete':
          return itemRepo.remove(db, action.id);
        case 'archiveMany':
          return itemRepo.archiveMany(db, action.ids);
        case 'deleteMany':
          return itemRepo.removeMany(db, action.ids);
        case 'bumpToNow':
          return itemRepo.bumpToNow(db, action.ids);
      }
    },
    onSuccess: invalidate,
  });
}
