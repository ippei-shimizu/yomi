import { beforeAll, describe, expect, it } from 'vitest';
import nacl from 'tweetnacl';

import { verifyUnlockCode, type UnlockPayload } from './unlockCode';

/**
 * テスト用の鍵ペアはここで生成する。**本番の秘密鍵はリポジトリに入れない**
 * （R-SEC3 / docs/DesignDoc.md §5.3）。
 */
let keyPair: nacl.SignKeyPair;
let otherKeyPair: nacl.SignKeyPair;

beforeAll(() => {
  keyPair = nacl.sign.keyPair();
  otherKeyPair = nacl.sign.keyPair();
});

const NOW_SECONDS = 1_800_000_000; // 2027-01-15 頃

function bytesToBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function issue(payload: UnlockPayload, secretKey = keyPair.secretKey): string {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const signature = nacl.sign.detached(bytes, secretKey);
  return `${bytesToBase64(bytes)}.${bytesToBase64(signature)}`;
}

const VALID_PAYLOAD: UnlockPayload = { sub: 'ippei', exp: 4_102_444_800 };

describe('verifyUnlockCode: 正しいコード', () => {
  it('署名が正しく期限内なら valid', () => {
    const result = verifyUnlockCode(issue(VALID_PAYLOAD), keyPair.publicKey, NOW_SECONDS);

    expect(result.valid).toBe(true);
    expect(result.valid && result.payload).toEqual(VALID_PAYLOAD);
  });

  it('前後の空白を許容する', () => {
    const code = `  ${issue(VALID_PAYLOAD)}  `;
    expect(verifyUnlockCode(code, keyPair.publicKey, NOW_SECONDS).valid).toBe(true);
  });
});

describe('verifyUnlockCode: 拒否すべきコード', () => {
  it('別の鍵で署名されたコードを拒否する', () => {
    const code = issue(VALID_PAYLOAD, otherKeyPair.secretKey);
    expect(verifyUnlockCode(code, keyPair.publicKey, NOW_SECONDS)).toEqual({
      valid: false,
      reason: 'bad-signature',
    });
  });

  // payload を書き換えると署名が合わなくなる
  it('payload を改竄したコードを拒否する', () => {
    const tampered = issue({ sub: 'attacker', exp: 4_102_444_800 });
    const [, signature] = issue(VALID_PAYLOAD).split('.');
    const forged = `${tampered.split('.')[0]}.${signature}`;

    expect(verifyUnlockCode(forged, keyPair.publicKey, NOW_SECONDS)).toEqual({
      valid: false,
      reason: 'bad-signature',
    });
  });

  it('期限切れのコードを拒否する', () => {
    const expired = issue({ sub: 'ippei', exp: NOW_SECONDS - 1 });
    expect(verifyUnlockCode(expired, keyPair.publicKey, NOW_SECONDS)).toEqual({
      valid: false,
      reason: 'expired',
    });
  });

  it('期限ちょうども拒否する', () => {
    const atBoundary = issue({ sub: 'ippei', exp: NOW_SECONDS });
    expect(verifyUnlockCode(atBoundary, keyPair.publicKey, NOW_SECONDS).valid).toBe(false);
  });

  it.each([
    ['', '空文字'],
    ['abc', 'ドットが無い'],
    ['a.b.c', 'ドットが多い'],
    ['!!!.!!!', 'base64 でない'],
    ['.', '中身が無い'],
  ])('%o（%s）を拒否する', (code) => {
    expect(verifyUnlockCode(code, keyPair.publicKey, NOW_SECONDS).valid).toBe(false);
  });

  it('署名の長さが違うコードを拒否する', () => {
    const [payload] = issue(VALID_PAYLOAD).split('.');
    const shortSignature = bytesToBase64(new Uint8Array(10));
    expect(
      verifyUnlockCode(`${payload}.${shortSignature}`, keyPair.publicKey, NOW_SECONDS),
    ).toEqual({ valid: false, reason: 'malformed' });
  });

  it('公開鍵の長さが違えば拒否する', () => {
    expect(verifyUnlockCode(issue(VALID_PAYLOAD), new Uint8Array(10), NOW_SECONDS)).toEqual({
      valid: false,
      reason: 'malformed',
    });
  });

  it.each([
    { sub: 'ippei' },
    { exp: 4_102_444_800 },
    { sub: '', exp: 4_102_444_800 },
    { sub: 'ippei', exp: 'soon' },
    { sub: 'ippei', exp: Number.NaN },
    'not an object',
  ])('payload の形が不正なら拒否する: %o', (payload) => {
    const bytes = new TextEncoder().encode(JSON.stringify(payload));
    const signature = nacl.sign.detached(bytes, keyPair.secretKey);
    const code = `${bytesToBase64(bytes)}.${bytesToBase64(signature)}`;

    expect(verifyUnlockCode(code, keyPair.publicKey, NOW_SECONDS).valid).toBe(false);
  });

  // 例外が起きても true を返す経路が無いこと（R-SEC4）
  it('どんな入力でも例外を投げない', () => {
    const inputs = ['', '.'.repeat(1000), 'あ'.repeat(1000), '\0', 'a'.repeat(100_000)];
    for (const input of inputs) {
      expect(() => verifyUnlockCode(input, keyPair.publicKey, NOW_SECONDS)).not.toThrow();
      expect(verifyUnlockCode(input, keyPair.publicKey, NOW_SECONDS).valid).toBe(false);
    }
  });
});
