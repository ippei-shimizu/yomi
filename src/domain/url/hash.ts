import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';

/**
 * 正規化済み URL から items.url_hash を作る（docs/DesignDoc.md §4.1）。
 *
 * ネイティブモジュール（expo-crypto）ではなく純 JS 実装を使う。Share
 * Extension はメモリ上限と起動 2 秒以内の制約があり、ネイティブモジュールの
 * 初期化を増やしたくないため。同期関数になるので保存処理も単純になる。
 */
export function urlHash(normalizedUrl: string): string {
  return bytesToHex(sha256(new TextEncoder().encode(normalizedUrl)));
}
