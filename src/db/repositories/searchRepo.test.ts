import { beforeEach, describe, expect, it } from 'vitest';

import { urlHash } from '@/domain/url';

import { createTestDb, type TestDatabase } from '../testing';
import * as itemRepo from './itemRepo';
import * as searchRepo from './searchRepo';
import * as tagRepo from './tagRepo';

const NOW = new Date('2026-08-22T10:00:00');

let db: TestDatabase;
beforeEach(() => {
  db = createTestDb();
});

let seq = 0;
function save(overrides: { title?: string; memo?: string; source?: 'zenn' | 'x' | 'qiita' } = {}) {
  seq += 1;
  const url = `https://example.com/${seq}`;
  const item = itemRepo.insert(
    db,
    { url, originalUrl: url, urlHash: urlHash(url), source: overrides.source ?? 'zenn' },
    NOW,
  );
  if (overrides.title !== undefined || overrides.memo !== undefined) {
    itemRepo.update(
      db,
      item.id,
      { title: overrides.title ?? null, memo: overrides.memo ?? null },
      NOW,
    );
  }
  return item;
}

describe('toMatchQuery（FTS5 のメタ文字対策）', () => {
  it('各トークンを引用符で囲む', () => {
    expect(searchRepo.toMatchQuery('rails queue')).toBe('"rails" "queue"');
  });

  // 素通しすると構文エラーで落ちるか、意図しない検索になる
  it.each(['AND', 'OR', 'NOT', 'NEAR', '*', '^', 'a:b', '-x'])('%o を安全に囲む', (input) => {
    const result = searchRepo.toMatchQuery(input);
    expect(result).not.toBeNull();
    expect(result?.startsWith('"')).toBe(true);
  });

  it('引用符を二重にしてエスケープする', () => {
    expect(searchRepo.toMatchQuery('say "hi"')).toBe('"say" """hi"""');
  });

  it('空白のみなら null', () => {
    expect(searchRepo.toMatchQuery('   ')).toBeNull();
  });
});

describe('escapeLike', () => {
  it('ワイルドカードをエスケープする', () => {
    expect(searchRepo.escapeLike('100%')).toBe('100\\%');
    expect(searchRepo.escapeLike('a_b')).toBe('a\\_b');
  });

  // % を素通しすると全件ヒットになる
  it('% だけの検索で全件ヒットしない', () => {
    save({ title: 'Rails' });
    save({ title: 'React' });

    expect(searchRepo.search(db, { query: '%' })).toHaveLength(0);
  });
});

describe('検索（無料プラン: title のみ）', () => {
  it('タイトルの部分一致で引ける', () => {
    save({ title: 'Solid Queue 入門' });
    save({ title: 'React Server Components' });

    expect(searchRepo.search(db, { query: 'Queue' }).map((i) => i.title)).toEqual([
      'Solid Queue 入門',
    ]);
  });

  it('メモは対象外', () => {
    save({ title: 'Rails 8', memo: 'ポーリング間隔の話' });

    expect(searchRepo.search(db, { query: 'ポーリング' })).toHaveLength(0);
  });
});

describe('検索（Pro: FTS5 で memo も対象）', () => {
  it('メモの部分一致で引ける', () => {
    save({ title: 'Rails 8', memo: 'ジョブのポーリング間隔の話' });
    save({ title: 'React', memo: '別の話' });

    const found = searchRepo.search(db, { query: 'ポーリング', includeMemo: true });
    expect(found.map((i) => i.title)).toEqual(['Rails 8']);
  });

  // 既定の unicode61 トークナイザだと日本語が 1 トークンになって引けない
  it('空白で区切られていない日本語の途中でも引ける（trigram）', () => {
    save({ title: 'Solid Queueのasyncモードについて' });

    expect(searchRepo.search(db, { query: 'モード', includeMemo: true })).toHaveLength(1);
    expect(searchRepo.search(db, { query: 'async', includeMemo: true })).toHaveLength(1);
  });

  // trigram は 3 文字未満を扱えないので LIKE に落とす
  it('2 文字以下のクエリでも LIKE で引ける', () => {
    save({ title: 'ロックの入門', memo: 'DB の話' });

    expect(searchRepo.search(db, { query: '入門', includeMemo: true })).toHaveLength(1);
    expect(searchRepo.search(db, { query: 'DB', includeMemo: true })).toHaveLength(1);
  });

  it('メモを更新すると検索結果に反映される（トリガ同期）', () => {
    const item = save({ title: 'Rails 8', memo: '最初のメモ' });
    expect(searchRepo.search(db, { query: '最初のメモ', includeMemo: true })).toHaveLength(1);

    itemRepo.update(db, item.id, { memo: '書き換えたメモ' }, NOW);

    expect(searchRepo.search(db, { query: '最初のメモ', includeMemo: true })).toHaveLength(0);
    expect(searchRepo.search(db, { query: '書き換えたメモ', includeMemo: true })).toHaveLength(1);
  });

  it('削除すると検索結果から消える', () => {
    const item = save({ title: 'Solid Queue 入門' });
    itemRepo.archive(db, item.id, NOW);
    itemRepo.remove(db, item.id);

    expect(searchRepo.search(db, { query: 'Solid Queue', includeMemo: true })).toHaveLength(0);
  });

  it('FTS5 のメタ文字を含む検索でも落ちない', () => {
    save({ title: 'A AND B' });

    for (const query of ['AND', 'OR', '"', '*', 'a OR b', '-x']) {
      expect(() => searchRepo.search(db, { query, includeMemo: true })).not.toThrow();
    }
  });
});

describe('フィルタ', () => {
  it('状態で絞り込む', () => {
    const read = save({ title: 'A' });
    save({ title: 'B' });
    itemRepo.markRead(db, read.id, { now: NOW });

    expect(searchRepo.search(db, { statuses: ['read'] }).map((i) => i.title)).toEqual(['A']);
  });

  it('ソースで絞り込む', () => {
    save({ title: 'A', source: 'zenn' });
    save({ title: 'B', source: 'x' });

    expect(searchRepo.search(db, { sources: ['x'] }).map((i) => i.title)).toEqual(['B']);
  });

  it('タグで絞り込む', () => {
    const tagged = save({ title: 'A' });
    save({ title: 'B' });
    const tag = tagRepo.create(db, 'rails', NOW);
    tagRepo.attach(db, tagged.id, tag.id, NOW);

    expect(searchRepo.search(db, { tagIds: [tag.id] }).map((i) => i.title)).toEqual(['A']);
  });

  it('複数タグのいずれかに一致する', () => {
    const a = save({ title: 'A' });
    const b = save({ title: 'B' });
    save({ title: 'C' });
    const rails = tagRepo.create(db, 'rails', NOW);
    const dbTag = tagRepo.create(db, 'db', NOW);
    tagRepo.attach(db, a.id, rails.id, NOW);
    tagRepo.attach(db, b.id, dbTag.id, NOW);

    expect(searchRepo.search(db, { tagIds: [rails.id, dbTag.id] })).toHaveLength(2);
  });

  it('条件を組み合わせる（AND）', () => {
    const target = save({ title: 'Rails 8', source: 'zenn' });
    save({ title: 'Rails 7', source: 'x' });
    itemRepo.markRead(db, target.id, { now: NOW });

    expect(
      searchRepo
        .search(db, { query: 'Rails', sources: ['zenn'], statuses: ['read'] })
        .map((i) => i.title),
    ).toEqual(['Rails 8']);
  });

  it('条件なしなら全件', () => {
    save({ title: 'A' });
    save({ title: 'B' });

    expect(searchRepo.search(db, {})).toHaveLength(2);
  });

  it('空文字の query は条件として扱わない', () => {
    save({ title: 'A' });
    expect(searchRepo.search(db, { query: '   ' })).toHaveLength(1);
  });
});

describe('countBySource', () => {
  it('ソースごとの件数を返す', () => {
    save({ source: 'zenn' });
    save({ source: 'zenn' });
    save({ source: 'x' });

    const counts = searchRepo.countBySource(db, 'unread');
    expect(counts).toEqual(
      expect.arrayContaining([
        { source: 'zenn', count: 2 },
        { source: 'x', count: 1 },
      ]),
    );
  });
});
