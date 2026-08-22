/**
 * 法務ページの構造。
 *
 * 文章を JSX に直接書くと、あとで英語版を足すときに文言と体裁が
 * ばらばらに散る。構造化データで持ち、描画は 1 つのコンポーネントに任せる。
 * react-native を import しない純粋モジュール。
 */

export const LEGAL_DOCUMENT_IDS = ['terms', 'privacy', 'commerce'] as const;

export type LegalDocumentId = (typeof LEGAL_DOCUMENT_IDS)[number];

export type LegalBlock =
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; items: readonly string[] }
  /** 「項目: 値」の並び。特定商取引法に基づく表記で使う */
  | { kind: 'entries'; items: readonly { term: string; value: string }[] };

export type LegalSection = {
  heading: string;
  blocks: readonly LegalBlock[];
};

export type LegalDocument = {
  id: LegalDocumentId;
  title: string;
  /** 最終改定日 */
  updatedAt: string;
  sections: readonly LegalSection[];
};

/**
 * 画面遷移パラメータを文書 ID にする。
 *
 * 未知の値は利用規約に倒す。存在しない文書を要求されたときに
 * 空白の画面を出すより、何かしら読める方がよい。
 */
export function parseLegalDocumentId(value: string | undefined): LegalDocumentId {
  return LEGAL_DOCUMENT_IDS.includes(value as LegalDocumentId)
    ? (value as LegalDocumentId)
    : 'terms';
}
