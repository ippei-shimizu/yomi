import { describe, expect, it } from 'vitest';

import { isUserCancelled } from './purchaseError';

describe('isUserCancelled', () => {
  it('userCancelled が true の例外だけを自主的なキャンセルとみなす', () => {
    expect(isUserCancelled({ userCancelled: true })).toBe(true);
    expect(isUserCancelled({ userCancelled: false })).toBe(false);
    expect(isUserCancelled({ code: 'NETWORK_ERROR' })).toBe(false);
  });

  it('オブジェクト以外は false', () => {
    expect(isUserCancelled(null)).toBe(false);
    expect(isUserCancelled(undefined)).toBe(false);
    expect(isUserCancelled(new Error('boom'))).toBe(false);
    expect(isUserCancelled('userCancelled')).toBe(false);
  });

  it('真値でも true 以外は false（誤判定でエラー表示を握り潰さない）', () => {
    expect(isUserCancelled({ userCancelled: 1 })).toBe(false);
    expect(isUserCancelled({ userCancelled: 'true' })).toBe(false);
  });
});
