import type { VerifyResult } from '@/domain/entitlement';
import type { Translate } from '@/lib/i18n';

/**
 * アンロックコードの検証結果を、開発者向けの 1 行にする。
 *
 * 公開鍵が空のまま（リリース前）だと必ず malformed になるので、
 * その可能性まで書いておかないと原因の切り分けができない。
 */
export function describeVerifyResult(t: Translate, result: VerifyResult): string {
  if (result.valid) return t('devUnlock.resultValid');

  switch (result.reason) {
    case 'expired':
      return t('devUnlock.resultExpired');
    case 'bad-signature':
      return t('devUnlock.resultBadSignature');
    case 'bad-payload':
      return t('devUnlock.resultBadPayload');
    case 'malformed':
      return t('devUnlock.resultMalformed');
  }
}
