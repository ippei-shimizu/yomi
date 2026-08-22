import { describe, expect, it } from 'vitest';

import { notchedPath } from './notchedPath';

/**
 * 切り欠きの形はレンダリングして目視するしかないが、パスの構造は
 * 検証できる。ノッチが消える・裏返るといった壊れ方を検知する。
 */
describe('notchedPath', () => {
  const path = notchedPath(300, 160, 28, 18, 80);

  it('閉じたパスを返す', () => {
    expect(path.startsWith('M ')).toBe(true);
    expect(path.trim().endsWith('Z')).toBe(true);
  });

  it('角丸 4 つ + 切り欠き 1 つで弧が 5 つある', () => {
    expect(path.match(/A /g)).toHaveLength(5);
  });

  it('切り欠きは指定した中心 Y をまたぐ', () => {
    // 半径 18、中心 80 なので 62 から 98
    expect(path).toContain('V 62');
    expect(path).toContain('A 18 18 0 0 0 300 98');
  });

  it('切り欠きの弧は内側にえぐる向き（sweep-flag が 0）', () => {
    const notchArc = path.match(/A 18 18 0 0 (\d)/);
    expect(notchArc?.[1]).toBe('0');
  });

  it('角丸の弧は外向き（sweep-flag が 1）', () => {
    const cornerArcs = path.match(/A 28 28 0 0 (\d)/g) ?? [];
    expect(cornerArcs).toHaveLength(4);
    expect(cornerArcs.every((arc) => arc.endsWith('1'))).toBe(true);
  });

  it('サイズを変えても構造が保たれる', () => {
    for (const [w, h] of [
      [200, 120],
      [400, 200],
    ] as const) {
      const p = notchedPath(w, h, 28, 18, h / 2);
      expect(p.match(/A /g)).toHaveLength(5);
      expect(p).toContain(`H ${w - 28}`);
    }
  });

  it('数値に NaN が混ざらない', () => {
    expect(path).not.toContain('NaN');
  });
});
