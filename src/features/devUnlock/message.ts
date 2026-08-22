import type { VerifyResult } from '@/domain/entitlement';

/**
 * アンロックコードの検証結果を、開発者向けの 1 行にする。
 *
 * 公開鍵が空のまま（リリース前）だと必ず malformed になるので、
 * その可能性まで書いておかないと原因の切り分けができない。
 */
export function describeVerifyResult(result: VerifyResult): string {
  if (result.valid) return '有効なコードです';

  switch (result.reason) {
    case 'expired':
      return '期限が切れています';
    case 'bad-signature':
      return '署名が一致しません';
    case 'bad-payload':
      return 'コードの内容が不正です';
    case 'malformed':
      return 'コードの形式が不正です（公開鍵が未設定の可能性があります）';
  }
}
