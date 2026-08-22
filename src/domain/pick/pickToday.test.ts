import { describe, expect, it } from 'vitest';

import { dateKeyOf, fnv1a, pickToday } from './pickToday';

const ITEMS = ['a', 'b', 'c', 'd', 'e'];

describe('pickToday', () => {
  it('同じ日・同じ nonce なら同じ結果', () => {
    const first = pickToday(ITEMS, '2026-08-22');
    for (let i = 0; i < 10; i += 1) {
      expect(pickToday(ITEMS, '2026-08-22')).toBe(first);
    }
  });

  it('日付が変われば結果が変わりうる（8 日間で 2 種類以上になる）', () => {
    const picks = new Set(
      Array.from({ length: 8 }, (_, i) => pickToday(ITEMS, `2026-08-${String(17 + i)}`)),
    );
    expect(picks.size).toBeGreaterThan(1);
  });

  it('nonce を変えると引き直せる', () => {
    const nonces = new Set(Array.from({ length: 5 }, (_, i) => pickToday(ITEMS, '2026-08-22', i)));
    expect(nonces.size).toBeGreaterThan(1);
  });

  it('候補が空なら null', () => {
    expect(pickToday([], '2026-08-22')).toBeNull();
  });

  it('候補が 1 件ならそれを返す', () => {
    expect(pickToday(['only'], '2026-08-22', 42)).toBe('only');
  });

  it('必ず候補の中から選ぶ', () => {
    for (let nonce = 0; nonce < 50; nonce += 1) {
      expect(ITEMS).toContain(pickToday(ITEMS, '2026-08-22', nonce));
    }
  });

  it('候補が多くても偏りすぎない（100 件で 30 日分が 10 種類以上）', () => {
    const many = Array.from({ length: 100 }, (_, i) => `item-${i}`);
    const picks = new Set(
      Array.from({ length: 30 }, (_, i) => pickToday(many, `2026-09-${String(i + 1)}`)),
    );
    expect(picks.size).toBeGreaterThanOrEqual(10);
  });
});

describe('fnv1a', () => {
  it('同じ入力に対して安定している', () => {
    expect(fnv1a('2026-08-22:0')).toBe(fnv1a('2026-08-22:0'));
  });

  it('入力が違えば値も違う', () => {
    expect(fnv1a('2026-08-22:0')).not.toBe(fnv1a('2026-08-22:1'));
  });

  it('32bit の非負整数を返す', () => {
    for (const input of ['', 'a', '2026-08-22:0', 'あ'.repeat(100)]) {
      const hash = fnv1a(input);
      expect(Number.isInteger(hash)).toBe(true);
      expect(hash).toBeGreaterThanOrEqual(0);
      expect(hash).toBeLessThanOrEqual(0xffffffff);
    }
  });

  it('既知のテストベクタ（FNV-1a 32bit）', () => {
    expect(fnv1a('')).toBe(0x811c9dc5);
    expect(fnv1a('a')).toBe(0xe40c292c);
    expect(fnv1a('foobar')).toBe(0xbf9cf968);
  });
});

describe('dateKeyOf', () => {
  it('ローカルタイムで YYYY-MM-DD にする', () => {
    expect(dateKeyOf(new Date('2026-08-22T23:59:59'))).toBe('2026-08-22');
    expect(dateKeyOf(new Date('2026-01-05T00:00:00'))).toBe('2026-01-05');
  });

  it('日付が変わるとキーも変わる', () => {
    expect(dateKeyOf(new Date('2026-08-22T23:59:59'))).not.toBe(
      dateKeyOf(new Date('2026-08-23T00:00:00')),
    );
  });
});
