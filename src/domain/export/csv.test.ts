import { describe, expect, it } from 'vitest';

import { UTF8_BOM, escapeCsvField, toCsvRow } from './csv';
import { CSV_HEADER, buildCsv } from './exportData';
import type { Item } from '@/db/schema';

const NOW = new Date('2026-08-22T10:00:00.000Z');

function item(overrides: Partial<Item> = {}): Item {
  return {
    id: 'x',
    url: 'https://zenn.dev/a',
    originalUrl: 'https://zenn.dev/a',
    urlHash: 'h',
    source: 'zenn',
    title: 'Solid Queue 入門',
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
    readAt: NOW,
    archivedAt: null,
    updatedAt: NOW,
    ...overrides,
  };
}

describe('escapeCsvField（RFC 4180）', () => {
  it('特殊文字が無ければそのまま', () => {
    expect(escapeCsvField('rails')).toBe('rails');
  });

  it.each([
    ['a,b', '"a,b"'],
    ['a\nb', '"a\nb"'],
    ['a\r\nb', '"a\r\nb"'],
    ['say "hi"', '"say ""hi"""'],
  ])('%o -> %o', (input, expected) => {
    expect(escapeCsvField(input)).toBe(expected);
  });

  it('空文字はそのまま', () => {
    expect(escapeCsvField('')).toBe('');
  });
});

describe('toCsvRow', () => {
  it('null / undefined を空セルにする', () => {
    expect(toCsvRow(['a', null, undefined, 'b'])).toBe('a,,,b');
  });
});

describe('buildCsv', () => {
  it('ヘッダ行が docs/PRD.md §7.6 の列と一致する', () => {
    const csv = buildCsv([]);
    expect(csv.replace(UTF8_BOM, '').split('\n')[0]).toBe(CSV_HEADER.join(','));
  });

  // 付けないと Excel / Numbers で日本語が文字化けする
  it('BOM を先頭に付ける', () => {
    expect(buildCsv([]).startsWith(UTF8_BOM)).toBe(true);
  });

  it('タグを空白区切りで出す', () => {
    const csv = buildCsv([{ item: item(), tags: ['rails', 'db'] }]);
    expect(csv).toContain('rails db');
  });

  // メモにカンマ・改行・引用符が入るのは日常的
  it('メモの特殊文字で行が壊れない', () => {
    const csv = buildCsv([
      { item: item({ memo: 'async, sync\nどちらも試した "結論" は保留' }), tags: [] },
    ]);

    const body = csv.replace(UTF8_BOM, '').split('\n').slice(1).join('\n');
    expect(body).toContain('"async, sync\nどちらも試した ""結論"" は保留"');
  });

  it('日時を ISO 8601 で出す', () => {
    const csv = buildCsv([{ item: item(), tags: [] }]);
    expect(csv).toContain('2026-08-22T10:00:00.000Z');
  });

  it('未読（read_at が無い）は空セルにする', () => {
    const csv = buildCsv([{ item: item({ status: 'unread', readAt: null }), tags: [] }]);
    const row = csv.replace(UTF8_BOM, '').split('\n')[1] ?? '';
    expect(row.split(',')).toContain('');
  });

  it('末尾に改行を入れる', () => {
    expect(buildCsv([{ item: item(), tags: [] }]).endsWith('\n')).toBe(true);
  });

  it('0 件でもヘッダだけの正しい CSV になる', () => {
    const csv = buildCsv([]);
    expect(csv.replace(UTF8_BOM, '').trim().split('\n')).toHaveLength(1);
  });
});
