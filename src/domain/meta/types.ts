/** メタデータ取得の結果（docs/DesignDoc.md §4.1 の items の該当カラムに対応） */
export type Metadata = {
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  siteName?: string;
  author?: string;
};

/** HTML を読み込む上限。iOS Extension / 端末のメモリを守る（§5.2） */
export const MAX_HTML_BYTES = 256 * 1024;

/** 1 件あたりのタイムアウト（§5.2） */
export const FETCH_TIMEOUT_MS = 8_000;
