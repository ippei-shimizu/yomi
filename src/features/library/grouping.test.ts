import { describe, expect, it } from 'vitest';

import { createTranslate } from '@/lib/i18n';

import type { Item } from '@/db/schema';

import { groupByMonth, memoPreview, sectionDateOf } from './grouping';

const NOW = new Date('2026-08-22T10:00:00');

function item(overrides: Partial<Item>): Item {
  return {
    id: 'x',
    url: 'https://zenn.dev/a',
    originalUrl: 'https://zenn.dev/a',
    urlHash: 'h',
    source: 'zenn',
    title: null,
    description: null,
    thumbnailUrl: null,
    siteName: null,
    author: null,
    status: 'read',
    metaStatus: 'done',
    metaRetryCount: 0,
    memo: null,
    snoozedUntil: null,
    savedAt: NOW,
    readAt: null,
    archivedAt: null,
    updatedAt: NOW,
    ...overrides,
  };
}

const t = createTranslate('ja');

describe('sectionDateOf', () => {
  it('既読は readAt を使う', () => {
    const readAt = new Date('2026-08-20T00:00:00');
    expect(sectionDateOf(item({ readAt }))).toEqual(readAt);
  });

  it('アーカイブは archivedAt を使う', () => {
    const archivedAt = new Date('2026-07-10T00:00:00');
    expect(sectionDateOf(item({ status: 'archived', archivedAt }))).toEqual(archivedAt);
  });

  it('どちらも無ければ savedAt にフォールバックする', () => {
    expect(sectionDateOf(item({}))).toEqual(NOW);
  });

  it('readAt が優先される', () => {
    const readAt = new Date('2026-08-20T00:00:00');
    const archivedAt = new Date('2026-08-21T00:00:00');
    expect(sectionDateOf(item({ readAt, archivedAt }))).toEqual(readAt);
  });
});

describe('groupByMonth', () => {
  it('月ごとに束ねる', () => {
    const sections = groupByMonth(
      t,
      [
        item({ id: '1', readAt: new Date('2026-08-20T00:00:00') }),
        item({ id: '2', readAt: new Date('2026-08-01T00:00:00') }),
        item({ id: '3', readAt: new Date('2026-07-31T00:00:00') }),
      ],
      NOW,
    );

    expect(sections.map((s) => s.label)).toEqual(['8月', '7月']);
    expect(sections[0]?.items.map((i) => i.id)).toEqual(['1', '2']);
    expect(sections[1]?.items.map((i) => i.id)).toEqual(['3']);
  });

  it('年が変わるセクションには年を付ける', () => {
    const sections = groupByMonth(t, [item({ readAt: new Date('2025-12-20T00:00:00') })], NOW);
    expect(sections[0]?.label).toBe('2025年12月');
  });

  it('同じ月でも年が違えば別セクション', () => {
    const sections = groupByMonth(
      t,
      [
        item({ id: '1', readAt: new Date('2026-08-01T00:00:00') }),
        item({ id: '2', readAt: new Date('2025-08-01T00:00:00') }),
      ],
      NOW,
    );

    expect(sections).toHaveLength(2);
    expect(sections.map((s) => s.label)).toEqual(['8月', '2025年8月']);
  });

  it('空なら空配列', () => {
    expect(groupByMonth(t, [], NOW)).toEqual([]);
  });

  it('月をまたいで戻るデータでも壊れない（別セクションになる）', () => {
    const sections = groupByMonth(
      t,
      [
        item({ id: '1', readAt: new Date('2026-08-20T00:00:00') }),
        item({ id: '2', readAt: new Date('2026-07-20T00:00:00') }),
        item({ id: '3', readAt: new Date('2026-08-10T00:00:00') }),
      ],
      NOW,
    );
    expect(sections.map((s) => s.key)).toEqual(['2026-08', '2026-07', '2026-08']);
  });
});

describe('memoPreview', () => {
  it('先頭 1 行を返す', () => {
    expect(memoPreview('async モードの話\n続きの行')).toBe('async モードの話');
  });

  it('前後の空白を落とす', () => {
    expect(memoPreview('  メモ  ')).toBe('メモ');
  });

  it.each([null, '', '   ', '\n\n'])('%o は null', (memo) => {
    expect(memoPreview(memo)).toBeNull();
  });
});
