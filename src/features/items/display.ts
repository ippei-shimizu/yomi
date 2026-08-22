import type { Item } from '@/db/schema';
import { daysBetween } from '@/domain/date/week';

/**
 * 表示用の文字列を組み立てる。react-native を import しない純粋モジュール（R-UI5）。
 */

/**
 * 一覧に出すタイトル。
 * メタ取得前・取得失敗時はホスト名にフォールバックする（docs/DesignDoc.md §5.2）。
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
  item: Pick<Item, 'siteName' | 'author' | 'url' | 'savedAt'>,
  now: Date,
): string {
  const site = item.siteName?.trim();
  const author = item.author?.trim();

  const left =
    author !== undefined && author.length > 0
      ? `@${author.replace(/^@/, '')}`
      : (site ?? hostnameOf(item.url));

  return `${left} · ${relativeDays(daysBetween(item.savedAt, now))}`;
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/** 「今日」「1日前」「12日前」。煽らないよう淡々と日数だけを出す（§7） */
export function relativeDays(days: number): string {
  if (days <= 0) return '今日';
  return `${days}日前`;
}

/** 未読件数の見出し。挨拶ではなく状態を主語にする（docs/DesignGuideline.md §7） */
export function unreadHeadline(count: number): string {
  return `未読 ${count} 件`;
}
