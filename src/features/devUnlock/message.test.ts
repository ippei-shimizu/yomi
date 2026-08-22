import { describe, expect, it } from 'vitest';

import { createTranslate } from '@/lib/i18n';

import { describeVerifyResult } from './message';

const t = createTranslate('ja');

describe('describeVerifyResult', () => {
  it('成功は成功と分かる文言を返す', () => {
    expect(describeVerifyResult(t, { valid: true, payload: { sub: 'dev', exp: 0 } })).toBe(
      '有効なコードです',
    );
  });

  it.each([
    ['expired', '期限が切れています'],
    ['bad-signature', '署名が一致しません'],
    ['bad-payload', 'コードの内容が不正です'],
  ] as const)('%s の理由を伝える', (reason, expected) => {
    expect(describeVerifyResult(t, { valid: false, reason })).toBe(expected);
  });

  it('malformed では公開鍵未設定の可能性にも触れる', () => {
    expect(describeVerifyResult(t, { valid: false, reason: 'malformed' })).toContain('公開鍵');
  });
});
