/**
 * UUID v7（RFC 9562）。items.id / tags.id / read_logs.id に使う。
 *
 * 先頭 48bit がミリ秒精度の Unix 時刻なので、id でソートすると保存順に
 * 並ぶ。将来 iCloud 同期に移行する際の衝突耐性も確保できる
 * （docs/DesignDoc.md §4.1 / §7.4）。
 *
 *   0                   1                   2                   3
 *  |          unix_ts_ms (48bit)           | ver |   rand_a      |
 *  |var|                  rand_b (62bit)                         |
 *
 * 乱数源を引数で受け取る純粋関数にしてあるのは、ネイティブモジュール抜きで
 * テストできるようにするため。実際の採番は newId()（id.ts）を使う。
 */

/** rand_a(12bit) + rand_b(62bit) を埋めるのに必要なバイト数 */
export const UUID_V7_RANDOM_BYTES = 10;

const HEX = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, '0'));

function toHex(bytes: Uint8Array): string {
  let out = '';
  for (const b of bytes) out += HEX[b];
  return out;
}

export function buildUuidV7(timestampMs: number, random: Uint8Array): string {
  if (!Number.isInteger(timestampMs) || timestampMs < 0) {
    throw new RangeError(`timestampMs must be a non-negative integer, got ${timestampMs}`);
  }
  if (random.length < UUID_V7_RANDOM_BYTES) {
    throw new RangeError(
      `random must have at least ${UUID_V7_RANDOM_BYTES} bytes, got ${random.length}`,
    );
  }

  const bytes = new Uint8Array(16);

  // unix_ts_ms を上位 48bit にビッグエンディアンで詰める。
  // 48bit は Number.MAX_SAFE_INTEGER に収まるので BigInt は不要。
  for (let i = 5; i >= 0; i -= 1) {
    bytes[i] = timestampMs % 256;
    timestampMs = Math.floor(timestampMs / 256);
  }

  bytes.set(random.subarray(0, UUID_V7_RANDOM_BYTES), 6);

  // version = 7（上位 4bit）
  bytes[6] = (bytes[6]! & 0x0f) | 0x70;
  // variant = 0b10（上位 2bit）
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;

  const hex = toHex(bytes);
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}
