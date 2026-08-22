import { addDays } from '@/domain/date/week';
import type { Translate } from '@/lib/i18n';

/**
 * Stats の表示整形。
 * react-native を import しない純粋モジュール。
 *
 * **数字は煽らない。** 感嘆符・絵文字を付けず、ストリークもランキングも置かない。
 */

/** 読了率（0–1）を「38%」に。データなしは「—」 */
export function formatRate(t: Translate, rate: number | null): string {
  return rate === null ? t('stats.noData') : `${Math.round(rate * 100)}%`;
}

/** 先週比。差が 0 なら空文字（何も出さない） */
export function formatDelta(current: number, previous: number): string {
  const delta = current - previous;
  if (delta === 0) return '';
  return delta > 0 ? `▲${delta}` : `▼${Math.abs(delta)}`;
}

/** 読了率の先週比。ポイント差で出す（「▼15pt」） */
export function formatRateDelta(current: number | null, previous: number | null): string {
  if (current === null || previous === null) return '';

  const delta = Math.round(current * 100) - Math.round(previous * 100);
  if (delta === 0) return '';
  return delta > 0 ? `▲${delta}pt` : `▼${Math.abs(delta)}pt`;
}

/** 「8/18 –」の週ラベル */
export function formatWeekRange(weekStart: Date): string {
  return `${weekStart.getMonth() + 1}/${weekStart.getDate()} –`;
}

/** 棒グラフ用の短いラベル（「8/18」） */
export function formatWeekTick(weekStart: Date): string {
  return `${weekStart.getMonth() + 1}/${weekStart.getDate()}`;
}

/** 週の終わり（日曜） */
export function weekEndOf(weekStart: Date): Date {
  return addDays(weekStart, 6);
}

/** 平均日数。「11 日」。実績なしは「—」 */
export function formatAverageDays(t: Translate, days: number | null): string {
  return days === null
    ? t('stats.noData')
    : t('stats.averageDaysValue', { days: Math.round(days), count: Math.round(days) });
}

/**
 * 棒グラフの高さ比（0–1）。最大値が 0 のときは全て 0。
 * 保存 0 の週があってもグラフが崩れないようにする。
 */
export function barRatios(values: number[]): number[] {
  const max = Math.max(...values, 0);
  return max === 0 ? values.map(() => 0) : values.map((value) => value / max);
}

export type WeekBar = { savedHeight: number; readHeight: number };

/**
 * 保存（薄）と読了（濃）の棒の高さを、**共通の最大値**を基準に計算する。
 *
 * 別々に正規化すると、読了 1 件の週の濃い棒が、保存 10 件の週の薄い棒と
 * 同じ高さになってしまい、グラフが実態を表さない。
 */
export function weekBars(
  weeks: readonly { saved: number; read: number }[],
  chartHeight: number,
): WeekBar[] {
  const max = Math.max(...weeks.map((week) => Math.max(week.saved, week.read)), 0);
  if (max === 0) return weeks.map(() => ({ savedHeight: 0, readHeight: 0 }));

  return weeks.map((week) => ({
    savedHeight: (week.saved / max) * chartHeight,
    readHeight: (week.read / max) * chartHeight,
  }));
}
