import { itemRepo, tagRepo } from '@/db/repositories';
import type { Tag } from '@/db/schema';
import type { YomiDatabase } from '@/db/types';
import { detectSource, extractFirstUrl, normalizeUrl, urlHash } from '@/domain/url';

/**
 * Share Extension の保存処理。
 *
 * UI と切り離した純粋なロジックにして、Node からテストできるようにしてある。
 * **ネットワークアクセスは一切行わない。** メタ取得は本体側の
 * MetaFetchWorker が担う（Extension はメモリ上限 ~120MB、起動 2 秒以内）。
 */

export type SaveState = 'saving' | 'saved' | 'duplicate' | 'limit' | 'error';

export type SaveOutcome =
  | { state: 'saved'; itemId: string; recentTags: Tag[] }
  | { state: 'duplicate' | 'limit' | 'error' };

export type SaveInput = {
  url?: string;
  text?: string;
};

export function save(
  db: YomiDatabase,
  input: SaveInput,
  { isPro, now = new Date() }: { isPro: boolean; now?: Date },
): SaveOutcome {
  const raw = input.url ?? (input.text === undefined ? null : extractFirstUrl(input.text));
  if (raw === null || raw === undefined) return { state: 'error' };

  const normalized = normalizeUrl(raw);
  if (normalized === null) return { state: 'error' };

  const hash = urlHash(normalized);
  if (itemRepo.existsByHash(db, hash)) return { state: 'duplicate' };
  if (!itemRepo.canSave(db, isPro)) return { state: 'limit' };

  const item = itemRepo.insert(
    db,
    {
      url: normalized,
      originalUrl: raw,
      urlHash: hash,
      source: detectSource(normalized),
      metaStatus: 'pending',
    },
    now,
  );

  return { state: 'saved', itemId: item.id, recentTags: tagRepo.listRecentlyUsed(db) };
}

/** 保存直後のタグ付け。新規タグの作成は Extension では行わない（本体で行う） */
export function attachTag(db: YomiDatabase, itemId: string, tagId: string, now = new Date()): void {
  tagRepo.attach(db, itemId, tagId, now);
}
