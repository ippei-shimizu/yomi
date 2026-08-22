import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useDatabase } from '@/db/DatabaseProvider';
import { invalidationKeys, queryKeys } from '@/db/queryKeys';
import { tagRepo } from '@/db/repositories';
import type { Tag } from '@/db/schema';

export function useTags() {
  const db = useDatabase();
  return useQuery({ queryKey: queryKeys.tags, queryFn: (): Tag[] => tagRepo.list(db) });
}

export function useTagsWithUsage() {
  const db = useDatabase();
  return useQuery({
    queryKey: [...queryKeys.tags, 'usage'],
    queryFn: () => tagRepo.listWithUsage(db),
  });
}

export function useItemTags(itemId: string) {
  const db = useDatabase();
  return useQuery({
    queryKey: [...queryKeys.tags, 'item', itemId],
    queryFn: (): Tag[] => tagRepo.listForItem(db, itemId),
  });
}

export type TagAction =
  | { type: 'create'; name: string }
  | { type: 'rename'; id: string; name: string }
  | { type: 'delete'; id: string }
  | { type: 'attach'; itemId: string; tagId: string }
  | { type: 'detach'; itemId: string; tagId: string };

export function useTagActions() {
  const db = useDatabase();
  const queryClient = useQueryClient();

  const invalidate = useCallback(async () => {
    await Promise.all(
      invalidationKeys.afterTagWrite.map((key) => queryClient.invalidateQueries({ queryKey: key })),
    );
  }, [queryClient]);

  return useMutation({
    mutationFn: async (action: TagAction) => {
      switch (action.type) {
        case 'create':
          return tagRepo.create(db, action.name);
        case 'rename':
          return tagRepo.rename(db, action.id, action.name);
        case 'delete':
          return tagRepo.remove(db, action.id);
        case 'attach':
          return tagRepo.attach(db, action.itemId, action.tagId);
        case 'detach':
          return tagRepo.detach(db, action.itemId, action.tagId);
      }
    },
    onSuccess: invalidate,
  });
}
