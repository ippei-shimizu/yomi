import type { ItemStatus } from './schema';

/**
 * React Query のキー（docs/DesignDoc.md §6）。
 *
 * 文字列を画面ごとに書くと invalidate の取りこぼしが起きるので、
 * 生成をここに集約する。
 */
export const queryKeys = {
  items: ['items'] as const,
  itemsByStatus: (status: ItemStatus, filter?: unknown) =>
    filter === undefined ? (['items', status] as const) : (['items', status, filter] as const),
  item: (id: string) => ['items', 'detail', id] as const,
  stale: ['items', 'stale'] as const,
  tags: ['tags'] as const,
  stats: ['stats'] as const,
} satisfies Record<string, unknown>;

/**
 * 書き込み後に無効化するキー。
 *
 * items を変えると Stats も変わる（read_logs が増えるため）ので必ず両方を
 * 落とす。片方を忘れると Stats が古いまま残る。
 */
export const invalidationKeys = {
  afterItemWrite: [queryKeys.items, queryKeys.stats],
  afterTagWrite: [queryKeys.tags, queryKeys.items],
} as const;
