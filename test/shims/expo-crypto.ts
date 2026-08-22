import { randomBytes } from 'node:crypto';

/**
 * Node でのテスト用に expo-crypto を差し替える（vitest.config.mts の alias）。
 *
 * expo-crypto は react-native を読み込むため Node では動かず、これを import
 * している Repository 層まで丸ごとテスト不能になってしまう。提供する契約
 * （OS の CSPRNG から指定バイト数を返す）は同じなので、node:crypto で代替する。
 *
 * UUID v7 の組み立てそのものは src/db/uuidv7.test.ts が乱数源を固定して
 * 検証しているため、ここで実装が入れ替わっても検証の穴にはならない。
 */
export function getRandomBytes(byteCount: number): Uint8Array {
  return new Uint8Array(randomBytes(byteCount));
}

export function getRandomBytesAsync(byteCount: number): Promise<Uint8Array> {
  return Promise.resolve(getRandomBytes(byteCount));
}
