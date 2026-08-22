import { detectSource, extractUrls, normalizeUrl, urlHash } from '@/domain/url';

/**
 * URL 一括インポートの解析（docs/DesignDoc.md §5.7）。
 * react-native を import しない純粋モジュール（R-UI5）。
 *
 *   入力テキスト → URL 抽出 → normalizeUrl → sha256 → 既存 hash と突合
 *   → プレビュー（新規 n 件 / 重複 m 件）
 */

export type ParsedUrl = {
  originalUrl: string;
  url: string;
  urlHash: string;
  source: ReturnType<typeof detectSource>;
};

export type ImportPreview = {
  /** 保存対象。入力内での重複も除いてある */
  fresh: ParsedUrl[];
  /** 既に保存済み、または入力内で重複していた件数 */
  duplicateCount: number;
  /** URL として解釈できなかった件数 */
  invalidCount: number;
};

/**
 * 貼り付けテキストを解析する。
 *
 * @param existingHashes 既に保存されている url_hash
 */
export function parseImportText(text: string, existingHashes: ReadonlySet<string>): ImportPreview {
  const fresh: ParsedUrl[] = [];
  const seen = new Set<string>();
  let duplicateCount = 0;
  let invalidCount = 0;

  for (const raw of extractUrls(text)) {
    const normalized = normalizeUrl(raw);
    if (normalized === null) {
      invalidCount += 1;
      continue;
    }

    const hash = urlHash(normalized);
    // 既存と重なるものに加え、入力テキスト内での重複もここで落とす
    if (existingHashes.has(hash) || seen.has(hash)) {
      duplicateCount += 1;
      continue;
    }

    seen.add(hash);
    fresh.push({
      originalUrl: raw,
      url: normalized,
      urlHash: hash,
      source: detectSource(normalized),
    });
  }

  return { fresh, duplicateCount, invalidCount };
}

/**
 * 無料プランの残り件数で切り詰める。
 *
 * `docs/PRD.md` §7.6 は「無料プラン上限を超える分は保存しない」としている。
 * インポート自体が Pro 専用なので通常は上限なしだが、Dev override が
 * 切れた場合などに備えて実装しておく。
 */
export function limitToRemaining(preview: ImportPreview, remaining: number | null): ImportPreview {
  if (remaining === null || preview.fresh.length <= remaining) return preview;
  return { ...preview, fresh: preview.fresh.slice(0, Math.max(0, remaining)) };
}
