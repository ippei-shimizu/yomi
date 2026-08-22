import type { Item } from '@/db/schema';

/**
 * Library の月ごとセクション（docs/Screens.md S08）。
 * react-native を import しない純粋モジュール（R-UI5）。
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

function monthLabelOf(date: Date, currentYear: number): string {
  const month = date.getMonth() + 1;
  return date.getFullYear() === currentYear ? `${month}月` : `${date.getFullYear()}年${month}月`;
}

/**
 * 月ごとに束ねる。入力は新しい順に整列済みである前提
 * （itemRepo.listByStatus がそう返す）。
 */
export function groupByMonth(items: Item[], now = new Date()): MonthSection[] {
  const sections: MonthSection[] = [];
  const currentYear = now.getFullYear();

  for (const item of items) {
    const date = sectionDateOf(item);
    const key = monthKeyOf(date);
    const last = sections.at(-1);

    if (last?.key === key) last.items.push(item);
    else sections.push({ key, label: monthLabelOf(date, currentYear), items: [item] });
  }

  return sections;
}

/** メモの先頭 1 行。Library の行に出す（docs/Screens.md S08） */
export function memoPreview(memo: string | null): string | null {
  if (memo === null) return null;
  const firstLine = memo.split('\n')[0]?.trim();
  return firstLine !== undefined && firstLine.length > 0 ? firstLine : null;
}
