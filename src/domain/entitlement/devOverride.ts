import * as SecureStore from 'expo-secure-store';

import { verifyUnlockCode, type VerifyResult } from './unlockCode';

/**
 * 開発者向けオーバーライド（docs/DesignDoc.md §5.3）。
 *
 * 検証に通ったコードだけを Keychain（expo-secure-store）に保存する。
 * MMKV ではなく Keychain を使うのは、書き換えの敷居を上げるため。
 */
const STORAGE_KEY = 'yomi.devUnlockCode';

/**
 * アプリに埋め込む Ed25519 公開鍵（base64）。
 *
 * **公開鍵なのでリポジトリに入れてよい。** 対応する秘密鍵は 1Password に
 * 保管し、絶対にコミットしない（R-SEC3）。
 *
 * 未設定（空文字）のあいだ、オーバーライドは常に無効になる。鍵の生成は
 * リリース前に行う。
 */
const PUBLIC_KEY_BASE64 = '';

function publicKeyBytes(): Uint8Array | null {
  if (PUBLIC_KEY_BASE64.length === 0) return null;
  try {
    return Uint8Array.from(atob(PUBLIC_KEY_BASE64), (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

export type OverrideState = { valid: false } | { valid: true; sub: string; exp: number };

/** 保存済みコードを検証する。検証に通らなければ無効（R-SEC4） */
export async function readOverride(): Promise<OverrideState> {
  const key = publicKeyBytes();
  if (key === null) return { valid: false };

  try {
    const code = await SecureStore.getItemAsync(STORAGE_KEY);
    if (code === null) return { valid: false };

    const result = verifyUnlockCode(code, key, nowSeconds());
    // 期限切れなど、もう通らないコードは残しておく意味がない
    if (!result.valid) {
      await SecureStore.deleteItemAsync(STORAGE_KEY);
      return { valid: false };
    }
    return { valid: true, sub: result.payload.sub, exp: result.payload.exp };
  } catch {
    return { valid: false };
  }
}

/** コードを検証し、通れば保存する */
export async function applyOverride(code: string): Promise<VerifyResult> {
  const key = publicKeyBytes();
  if (key === null) return { valid: false, reason: 'malformed' };

  const result = verifyUnlockCode(code, key, nowSeconds());
  if (result.valid) await SecureStore.setItemAsync(STORAGE_KEY, code.trim());
  return result;
}

export async function clearOverride(): Promise<void> {
  await SecureStore.deleteItemAsync(STORAGE_KEY);
}
