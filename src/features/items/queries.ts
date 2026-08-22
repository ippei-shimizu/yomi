import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useDatabase } from '@/db/DatabaseProvider';
import { invalidationKeys, queryKeys } from '@/db/queryKeys';
import { itemRepo, tagRepo } from '@/db/repositories';
import type { Item, Tag } from '@/db/schema';

/**
 * 画面から使う DB アクセス（docs/DesignDoc.md §6）。
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

/** 複数アイテムのタグをまとめて引く。行ごとに引くと N+1 になる（R-DB7） */
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
  | { type: 'bumpToNow'; ids: string[] };

export function useItemActions() {
  const db = useDatabase();
  const invalidate = useInvalidateItems();

  return useMutation({
    mutationFn: async (action: ItemAction) => {
      switch (action.type) {
        case 'read':
          return itemRepo.markRead(db, action.id, { memo: action.memo });
        case 'archive':
          return itemRepo.archive(db, action.id);
        case 'restore':
          return itemRepo.restoreToUnread(db, action.id);
        case 'snooze':
          return itemRepo.snooze(db, action.id, action.days);
        case 'delete':
          return itemRepo.remove(db, action.id);
        case 'archiveMany':
          return itemRepo.archiveMany(db, action.ids);
        case 'bumpToNow':
          return itemRepo.bumpToNow(db, action.ids);
      }
    },
    onSuccess: invalidate,
  });
}
