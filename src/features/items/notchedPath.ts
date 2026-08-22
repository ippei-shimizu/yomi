/**
 * Today's Pick のノッチ形状。
 *
 * react-native を import しない純粋なモジュールにしてある。Node から
 * テストするため。描画側は NotchedCard.tsx。
 */
/**
 * 角丸 + 右辺の円形切り欠きを持つパスを作る。
 *
 * 時計回りに、左上 → 右上 → 切り欠きの手前 → 切り欠き（反時計回りの弧）→
 * 切り欠きの先 → 右下 → 左下 の順で描く。
 */
export function notchedPath(
  width: number,
  height: number,
  cornerRadius: number,
  notchRadius: number,
  notchCenterY: number,
): string {
  const r = cornerRadius;
  const n = notchRadius;
  const top = notchCenterY - n;
  const bottom = notchCenterY + n;

  return [
    `M ${r} 0`,
    `H ${width - r}`,
    `A ${r} ${r} 0 0 1 ${width} ${r}`,
    `V ${top}`,
    // sweep-flag 0 で左向きに膨らむ弧＝カードを内側にえぐる
    `A ${n} ${n} 0 0 0 ${width} ${bottom}`,
    `V ${height - r}`,
    `A ${r} ${r} 0 0 1 ${width - r} ${height}`,
    `H ${r}`,
    `A ${r} ${r} 0 0 1 0 ${height - r}`,
    `V ${r}`,
    `A ${r} ${r} 0 0 1 ${r} 0`,
    'Z',
  ].join(' ');
}
