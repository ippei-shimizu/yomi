/**
 * 週・日付の計算。すべて**端末のローカルタイム**で扱う。
 *
 * 週の起点は月曜固定。Stats の集計と
 * 放置日数の判定がこれに依存する。
 */

export const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** その日の 00:00:00.000（ローカル） */
export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** 直近の月曜 00:00:00.000（ローカル）。日曜は 6 日前の月曜に属する */
export function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  // getDay(): 0=日 1=月 ... 6=土 → 月曜を 0 とする距離に変換する
  const daysSinceMonday = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - daysSinceMonday);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  // setDate は月またぎ・DST を正しく処理する
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * 経過日数（カレンダー日での差）。放置日数バッジの判定に使う。
 *
 * ミリ秒の割り算ではなく日付境界で数えるので、「昨日の 23:59 に保存」が
 * 翌 00:01 に 1 日として数えられる。ユーザーの体感に合わせる。
 */
export function daysBetween(from: Date, to: Date): number {
  const diff = startOfDay(to).getTime() - startOfDay(from).getTime();
  return Math.round(diff / MS_PER_DAY);
}

/** 古い順に count 週分の週初め（月曜）を返す。末尾が now を含む週 */
export function recentWeekStarts(now: Date, count: number): Date[] {
  if (count < 1) return [];
  const thisWeek = startOfWeek(now);
  return Array.from({ length: count }, (_, i) => addDays(thisWeek, (i - (count - 1)) * 7));
}
