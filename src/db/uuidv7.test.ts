import { describe, expect, it } from 'vitest';
import { UUID_V7_RANDOM_BYTES, buildUuidV7 } from './uuidv7';

const zeros = new Uint8Array(UUID_V7_RANDOM_BYTES);
const ones = new Uint8Array(UUID_V7_RANDOM_BYTES).fill(0xff);

describe('buildUuidV7', () => {
  it('UUID の書式で返す', () => {
    expect(buildUuidV7(Date.now(), ones)).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it('version が 7 になる', () => {
    for (const random of [zeros, ones]) {
      expect(buildUuidV7(1_700_000_000_000, random)[14]).toBe('7');
    }
  });

  it('variant が 0b10 になる（先頭が 8/9/a/b）', () => {
    for (const random of [zeros, ones]) {
      expect(buildUuidV7(1_700_000_000_000, random)[19]).toMatch(/[89ab]/);
    }
  });

  it('先頭 48bit が unix_ts_ms のビッグエンディアン表現になる', () => {
    const ts = 0x0123456789ab;
    const uuid = buildUuidV7(ts, zeros);
    expect(uuid.slice(0, 8) + uuid.slice(9, 13)).toBe('0123456789ab');
  });

  it('時刻が進むと辞書順でも後になる（id でソート = 保存順）', () => {
    const base = 1_700_000_000_000;
    const ids = [base, base + 1, base + 1000, base + 86_400_000].map((t) => buildUuidV7(t, zeros));
    expect([...ids].sort()).toEqual(ids);
  });

  it('同じミリ秒でも乱数が違えば別の id になる', () => {
    const ts = 1_700_000_000_000;
    const a = buildUuidV7(ts, new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));
    const b = buildUuidV7(ts, new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 11]));
    expect(a).not.toBe(b);
  });

  it('乱数部分だけが変わり、時刻部分は変わらない', () => {
    const ts = 1_700_000_000_000;
    const a = buildUuidV7(ts, zeros);
    const b = buildUuidV7(ts, ones);
    expect(a.slice(0, 13)).toBe(b.slice(0, 13));
  });

  it('時刻 0 でも壊れない', () => {
    expect(buildUuidV7(0, zeros)).toBe('00000000-0000-7000-8000-000000000000');
  });

  it('48bit の上限（約 10889 年）まで扱える', () => {
    const max = 2 ** 48 - 1;
    const uuid = buildUuidV7(max, zeros);
    expect(uuid.slice(0, 8) + uuid.slice(9, 13)).toBe('ffffffffffff');
  });

  describe('不正な入力', () => {
    it.each([-1, 1.5, NaN, Infinity])('timestampMs=%o は RangeError', (ts) => {
      expect(() => buildUuidV7(ts, zeros)).toThrow(RangeError);
    });

    it('乱数が足りなければ RangeError', () => {
      expect(() => buildUuidV7(0, new Uint8Array(UUID_V7_RANDOM_BYTES - 1))).toThrow(RangeError);
    });
  });
});
