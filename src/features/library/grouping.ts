import type { Item } from '@/db/schema';
import type { MessageKey, Translate } from '@/lib/i18n';

/**
 * Library の月ごとセクション。
 * react-native を import しない純粋モジュール。
 */

export type MonthSection = {
  /** "2026-08" */
  key: string;
  /** "8月"。年が変わる場合は "2025年12月" */
  label: string;
  items: Item[];
};

/** 状態になった日時。read は readAt、archived は archivedAt を使う */
export function sectionDateOf(item: Item): Date {
  return item.readAt ?? item.archivedAt ?? item.savedAt;
}

function monthKeyOf(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabelOf(t: Translate, date: Date, currentYear: number): string {
  // 月の呼び方は言語で違う（"8月" と "August"）ので、数値ではなく名前を渡す
  const month = t(`month.${date.getMonth() + 1}` as MessageKey);
  return date.getFullYear() === currentYear
    ? t('library.monthHeading', { month })
    : t('library.monthWithYearHeading', { year: date.getFullYear(), month });
}

/**
 * 月ごとに束ねる。入力は新しい順に整列済みである前提
 * （itemRepo.listByStatus がそう返す）。
 */
export function groupByMonth(t: Translate, items: Item[], now = new Date()): MonthSection[] {
  const sections: MonthSection[] = [];
  const currentYear = now.getFullYear();

  for (const item of items) {
    const date = sectionDateOf(item);
    const key = monthKeyOf(date);
    const last = sections.at(-1);

    if (last?.key === key) last.items.push(item);
    else sections.push({ key, label: monthLabelOf(t, date, currentYear), items: [item] });
  }

  return sections;
}

/** メモの先頭 1 行。Library の行に出す */
export function memoPreview(memo: string | null): string | null {
  if (memo === null) return null;
  const firstLine = memo.split('\n')[0]?.trim();
  return firstLine !== undefined && firstLine.length > 0 ? firstLine : null;
}
