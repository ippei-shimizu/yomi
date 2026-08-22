import { useQuery } from '@tanstack/react-query';
import { useDeferredValue, useState } from 'react';

import { useDatabase } from '@/db/DatabaseProvider';
import { queryKeys } from '@/db/queryKeys';
import { searchRepo } from '@/db/repositories';
import type { Item, ItemStatus } from '@/db/schema';
import type { Source } from '@/domain/url';

export type LibraryFilter = {
  query: string;
  sources: Source[];
  tagIds: string[];
};

export const EMPTY_FILTER: LibraryFilter = { query: '', sources: [], tagIds: [] };

export function useLibraryFilter() {
  const [filter, setFilter] = useState<LibraryFilter>(EMPTY_FILTER);

  return {
    filter,
    setQuery: (query: string) => setFilter((current) => ({ ...current, query })),
    toggleSource: (source: Source) =>
      setFilter((current) => ({
        ...current,
        sources: current.sources.includes(source)
          ? current.sources.filter((s) => s !== source)
          : [...current.sources, source],
      })),
    toggleTag: (tagId: string) =>
      setFilter((current) => ({
        ...current,
        tagIds: current.tagIds.includes(tagId)
          ? current.tagIds.filter((id) => id !== tagId)
          : [...current.tagIds, tagId],
      })),
    reset: () => setFilter(EMPTY_FILTER),
    isActive:
      filter.query.trim().length > 0 || filter.sources.length > 0 || filter.tagIds.length > 0,
  };
}

/**
 * 検索を実行する。
 *
 * 入力のたびにクエリを投げないよう useDeferredValue で遅らせる。
 * 5,000 件でも 500ms 以内という要件（docs/PRD.md §8）があるため、
 * 打鍵ごとの実行は避ける。
 */
export function useSearchResults(status: ItemStatus, filter: LibraryFilter, includeMemo: boolean) {
  const db = useDatabase();
  const deferred = useDeferredValue(filter);

  return useQuery({
    queryKey: [...queryKeys.items, 'search', status, deferred, includeMemo],
    queryFn: (): Item[] =>
      searchRepo.search(db, {
        query: deferred.query,
        statuses: [status],
        sources: deferred.sources,
        tagIds: deferred.tagIds,
        includeMemo,
      }),
  });
}
