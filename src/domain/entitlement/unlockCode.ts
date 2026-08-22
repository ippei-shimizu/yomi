import nacl from 'tweetnacl';

/**
 * 開発者向けオーバーライドの署名検証（docs/DesignDoc.md §5.3）。
 *
 * アンロックコード = base64(payload) + "." + base64(signature)
 * payload = { "sub": "ippei", "exp": 4102444800 }
 *
 * アプリに埋め込むのは**公開鍵のみ**。署名を作れるのは秘密鍵を持つ本人だけ。
 * react-native を import しない純粋モジュールにしてあり、鍵と検証ロジックを
 * Node からテストできる（R-UI5 / R-TEST1）。
 */

export type UnlockPayload = {
  sub: string;
  /** 有効期限（Unix 秒） */
  exp: number;
};

export type VerifyResult =
  | { valid: true; payload: UnlockPayload }
  | { valid: false; reason: 'malformed' | 'bad-signature' | 'expired' | 'bad-payload' };

function base64ToBytes(value: string): Uint8Array | null {
  try {
    // URL-safe base64 も受け付ける
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(normalized);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
}

function parsePayload(bytes: Uint8Array): UnlockPayload | null {
  try {
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (typeof parsed !== 'object' || parsed === null) return null;

    const record = parsed as Record<string, unknown>;
    const sub = record['sub'];
    const exp = record['exp'];
    if (typeof sub !== 'string' || sub.length === 0) return null;
    if (typeof exp !== 'number' || !Number.isFinite(exp)) return null;

    return { sub, exp };
  } catch {
    return null;
  }
}

/**
 * アンロックコードを検証する。
 *
 * **失敗はすべて「無効」に倒す**（R-SEC4）。例外時に true を返す経路を作らない。
 *
 * @param publicKey アプリに埋め込む Ed25519 公開鍵（32 バイト）
 * @param nowSeconds 現在時刻（Unix 秒）
 */
export function verifyUnlockCode(
  code: string,
  publicKey: Uint8Array,
  nowSeconds: number,
): VerifyResult {
  const parts = code.trim().split('.');
  if (parts.length !== 2) return { valid: false, reason: 'malformed' };

  const payloadBytes = base64ToBytes(parts[0]!);
  const signature = base64ToBytes(parts[1]!);
  if (payloadBytes === null || signature === null) return { valid: false, reason: 'malformed' };
  if (signature.length !== nacl.sign.signatureLength) return { valid: false, reason: 'malformed' };
  if (publicKey.length !== nacl.sign.publicKeyLength) return { valid: false, reason: 'malformed' };

  if (!nacl.sign.detached.verify(payloadBytes, signature, publicKey)) {
    return { valid: false, reason: 'bad-signature' };
  }

  const payload = parsePayload(payloadBytes);
  if (payload === null) return { valid: false, reason: 'bad-payload' };
  if (payload.exp <= nowSeconds) return { valid: false, reason: 'expired' };

  return { valid: true, payload };
}
