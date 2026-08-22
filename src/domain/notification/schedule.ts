import { addDays } from '@/domain/date/week';

/**
 * 通知のスケジュール計算。
 * react-native を import しない純粋モジュール。
 */

/** 何日分先までスケジュールするか */
export const SCHEDULE_DAYS = 7;

/** "HH:mm" 形式の時刻 */
export type TimeOfDay = { hour: number; minute: number };

/** 既定の通知時刻 */
export const DEFAULT_TIME_OF_DAY: TimeOfDay = { hour: 8, minute: 0 };

/** 既定の通知時刻の文字列表現。設定値の初期値として保存する */
export const DEFAULT_NOTIFICATION_TIME = formatTimeOfDay(DEFAULT_TIME_OF_DAY);

export function parseTimeOfDay(value: string): TimeOfDay | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  return { hour, minute };
}

/**
 * "07:00,21:00" のような設定文字列を時刻の配列にする。
 *
 * 1 つも読めなかった場合は既定値に倒す。空配列を返すと通知が止まり、
 * 利用者からは「設定したのに来ない」としか見えなくなる。
 */
export function parseTimeList(raw: string): TimeOfDay[] {
  const times = raw
    .split(',')
    .map((value) => parseTimeOfDay(value))
    .filter((time): time is TimeOfDay => time !== null);

  return times.length > 0 ? times : [DEFAULT_TIME_OF_DAY];
}

export function formatTimeOfDay({ hour, minute }: TimeOfDay): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/**
 * 指定時刻の、次に来る発火日時を返す。
 * すでに今日の時刻を過ぎていれば翌日になる。
 */
export function nextOccurrence(time: TimeOfDay, now: Date): Date {
  const candidate = new Date(now);
  candidate.setHours(time.hour, time.minute, 0, 0);
  return candidate > now ? candidate : addDays(candidate, 1);
}

/**
 * 翌 SCHEDULE_DAYS 日分の発火日時を、時刻ごとに展開して返す。
 *
 * Pro は複数時刻を設定できる。同じ日時が重複しないよう
 * 昇順に整列して返す。
 */
export function occurrencesFor(times: TimeOfDay[], now: Date, days = SCHEDULE_DAYS): Date[] {
  const result: Date[] = [];

  for (const time of times) {
    const first = nextOccurrence(time, now);
    for (let i = 0; i < days; i += 1) result.push(addDays(first, i));
  }

  return result.sort((a, b) => a.getTime() - b.getTime());
}
