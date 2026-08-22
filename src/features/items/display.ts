import type { Item } from '@/db/schema';
import { daysBetween } from '@/domain/date/week';
import type { Translate } from '@/lib/i18n';

/**
 * 表示用の文字列を組み立てる。react-native を import しない純粋モジュール。
 */

/**
 * 一覧に出すタイトル。
 * メタ取得前・取得失敗時はホスト名にフォールバックする。
 */
export function displayTitle(item: Pick<Item, 'title' | 'url'>): string {
  const title = item.title?.trim();
  if (title !== undefined && title.length > 0) return title;

  try {
    return new URL(item.url).hostname;
  } catch {
    return item.url;
  }
}

/** 「zenn.dev · 12日前」の行 */
export function subtitleOf(
  t: Translate,
  item: Pick<Item, 'siteName' | 'author' | 'url' | 'savedAt'>,
  now: Date,
): string {
  const site = item.siteName?.trim();
  const author = item.author?.trim();

  const left =
    author !== undefined && author.length > 0
      ? `@${author.replace(/^@/, '')}`
      : (site ?? hostnameOf(item.url));

  return `${left} · ${relativeDays(t, daysBetween(item.savedAt, now))}`;
}

/** URL のホスト名。パースできない文字列はそのまま返す */
export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/** 「今日」「1日前」「12日前」。煽らないよう淡々と日数だけを出す */
export function relativeDays(t: Translate, days: number): string {
  return days <= 0 ? t('item.today') : t('item.daysAgo', { count: days });
}

/** 未読件数の見出し。挨拶ではなく状態を主語にする */
export function unreadHeadline(t: Translate, count: number): string {
  return t('home.unreadHeadline', { count });
}

/** 「8/22」。年は出さない。詳細画面の狭い行に収めるため */
export function shortDate(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}
