import { itemRepo } from '@/db/repositories';
import type { YomiDatabase } from '@/db/types';
import type { Item } from '@/db/schema';
import { normalizeUrl, urlHash } from '@/domain/url';

import { fetchMetadata, type FetchOptions } from './fetchMetadata';
import type { Metadata } from './types';

/**
 * MetaFetchWorker（docs/DesignDoc.md §5.2）。
 *
 *   トリガー: 本体 foreground 時 / expo-background-task
 *   対象:    meta_status='pending' AND meta_retry_count < 3 を saved_at ASC で最大 10 件
 *   並列:    3
 *   タイムアウト: 8s / 件
 */

/** 1 回あたりの処理件数 */
export const DEFAULT_BATCH_SIZE = 10;

/** URL 一括インポート直後だけ引き上げる件数（§5.7） */
export const IMPORT_BATCH_SIZE = 50;

/** 同時に走らせる数 */
export const CONCURRENCY = 3;

/** 短縮 URL のホスト。展開してから正規化しないと重複検知が効かない */
const SHORTENER_HOSTS = new Set(['t.co', 'bit.ly', 'buff.ly', 'ow.ly', 'is.gd']);

export type WorkerResult = {
  processed: number;
  succeeded: number;
  failed: number;
  /** 短縮 URL の展開先が既存アイテムと重なって統合された件数 */
  merged: number;
};

export type RunOptions = FetchOptions & {
  batchSize?: number;
  concurrency?: number;
  now?: Date;
};

export async function runMetaFetchWorker(
  db: YomiDatabase,
  options: RunOptions = {},
): Promise<WorkerResult> {
  const { batchSize = DEFAULT_BATCH_SIZE, concurrency = CONCURRENCY, now = new Date() } = options;

  const targets = itemRepo.listPendingMeta(db, batchSize);
  const result: WorkerResult = { processed: 0, succeeded: 0, failed: 0, merged: 0 };
  if (targets.length === 0) return result;

  // 1 件のタイムアウトが他をブロックしないよう、固定数のワーカーで queue を消費する
  const queue = [...targets];
  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    for (;;) {
      const item = queue.shift();
      if (!item) return;

      const outcome = await processOne(db, item, options, now);
      result.processed += 1;
      if (outcome === 'succeeded') result.succeeded += 1;
      else if (outcome === 'merged') result.merged += 1;
      else result.failed += 1;
    }
  });

  await Promise.all(workers);
  return result;
}

type Outcome = 'succeeded' | 'failed' | 'merged';

async function processOne(
  db: YomiDatabase,
  item: Item,
  options: FetchOptions,
  now: Date,
): Promise<Outcome> {
  let url = item.url;

  if (isShortenerUrl(url)) {
    const expansion = await expandShortUrl(db, item, options, now);
    if (expansion.outcome === 'merged') return 'merged';
    if (expansion.url !== undefined) url = expansion.url;
  }

  const fetched = await fetchMetadata(url, options);
  if (!fetched.ok) {
    itemRepo.recordMetaFailure(db, item.id, now);
    return 'failed';
  }

  itemRepo.applyMetadata(db, item.id, toColumns(fetched.metadata), now);
  return 'succeeded';
}

function isShortenerUrl(url: string): boolean {
  try {
    return SHORTENER_HOSTS.has(new URL(url).hostname.toLowerCase());
  } catch {
    return false;
  }
}

/**
 * 短縮 URL を HEAD で展開して url / url_hash を更新する（§5.5）。
 * 展開に失敗しても失敗扱いにはせず、元の URL のままメタ取得へ進む。
 */
async function expandShortUrl(
  db: YomiDatabase,
  item: Item,
  { fetchImpl = globalThis.fetch }: FetchOptions,
  now: Date,
): Promise<{ outcome?: 'merged'; url?: string }> {
  let finalUrl: string;
  try {
    const response = await fetchImpl(item.url, { method: 'HEAD', redirect: 'follow' });
    finalUrl = response.url;
  } catch {
    return {};
  }

  const normalized = normalizeUrl(finalUrl);
  if (normalized === null || normalized === item.url) return {};

  const outcome = itemRepo.applyExpandedUrl(db, item.id, normalized, urlHash(normalized), now);
  return outcome === 'merged' ? { outcome: 'merged' } : { url: normalized };
}

/** Metadata（任意フィールド）を items のカラムに写す */
function toColumns(metadata: Metadata) {
  return {
    ...(metadata.title === undefined ? {} : { title: metadata.title }),
    ...(metadata.description === undefined ? {} : { description: metadata.description }),
    ...(metadata.thumbnailUrl === undefined ? {} : { thumbnailUrl: metadata.thumbnailUrl }),
    ...(metadata.siteName === undefined ? {} : { siteName: metadata.siteName }),
    ...(metadata.author === undefined ? {} : { author: metadata.author }),
  };
}
