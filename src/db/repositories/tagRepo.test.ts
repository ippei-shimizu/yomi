import { beforeEach, describe, expect, it } from 'vitest';

import { itemTags } from '../schema';
import { createTestDb, type TestDatabase } from '../testing';
import * as itemRepo from './itemRepo';
import * as tagRepo from './tagRepo';

const NOW = new Date('2026-08-22T10:00:00');

let db: TestDatabase;
beforeEach(() => {
  db = createTestDb();
});

function saveItem(urlHash: string) {
  return itemRepo.insert(
    db,
    {
      url: `https://zenn.dev/${urlHash}`,
      originalUrl: 'https://zenn.dev/a',
      urlHash,
      source: 'zenn',
    },
    NOW,
  );
}

describe('create / list', () => {
  it('作成して名前順に返す', () => {
    tagRepo.create(db, 'rails', NOW);
    tagRepo.create(db, 'db', NOW);

    expect(tagRepo.list(db).map((t) => t.name)).toEqual(['db', 'rails']);
  });

  it('同じ名前は作れない', () => {
    tagRepo.create(db, 'rails', NOW);
    expect(() => tagRepo.create(db, 'rails', NOW)).toThrow(/UNIQUE/i);
  });
});

describe('canCreate（無料プランのタグ上限）', () => {
  it('3 個までは作れて 4 個目で止まる', () => {
    for (const name of ['a', 'b']) tagRepo.create(db, name, NOW);
    expect(tagRepo.canCreate(db, false)).toBe(true);

    tagRepo.create(db, 'c', NOW);
    expect(tagRepo.countAll(db)).toBe(tagRepo.FREE_PLAN_TAG_LIMIT);
    expect(tagRepo.canCreate(db, false)).toBe(false);
  });

  it('Pro は上限なし', () => {
    for (const name of ['a', 'b', 'c', 'd']) tagRepo.create(db, name, NOW);
    expect(tagRepo.canCreate(db, true)).toBe(true);
  });
});

describe('attach / detach', () => {
  it('付け外しできる', () => {
    const item = saveItem('h1');
    const tag = tagRepo.create(db, 'rails', NOW);

    tagRepo.attach(db, item.id, tag.id, NOW);
    expect(tagRepo.listForItem(db, item.id).map((t) => t.name)).toEqual(['rails']);

    tagRepo.detach(db, item.id, tag.id);
    expect(tagRepo.listForItem(db, item.id)).toEqual([]);
  });

  // UI 側で握りつぶす必要をなくすため、二重付与は失敗させない
  it('同じタグを二度付けても失敗しない', () => {
    const item = saveItem('h1');
    const tag = tagRepo.create(db, 'rails', NOW);

    tagRepo.attach(db, item.id, tag.id, NOW);
    expect(() => tagRepo.attach(db, item.id, tag.id, NOW)).not.toThrow();
    expect(db.select().from(itemTags).all()).toHaveLength(1);
  });

  it('タグを消すと item_tags も消えるがアイテムは残る', () => {
    const item = saveItem('h1');
    const tag = tagRepo.create(db, 'rails', NOW);
    tagRepo.attach(db, item.id, tag.id, NOW);

    tagRepo.remove(db, tag.id);
    expect(tagRepo.listForItem(db, item.id)).toEqual([]);
    expect(itemRepo.findById(db, item.id)).toBeDefined();
  });

  it('リネームしても紐づいたアイテムが外れない', () => {
    const item = saveItem('h1');
    const tag = tagRepo.create(db, 'rails', NOW);
    tagRepo.attach(db, item.id, tag.id, NOW);

    tagRepo.rename(db, tag.id, 'ruby-on-rails', NOW);
    expect(tagRepo.listForItem(db, item.id).map((t) => t.name)).toEqual(['ruby-on-rails']);
  });
});

describe('listForItems（N+1 回避）', () => {
  it('複数アイテムのタグを 1 回でまとめて引く', () => {
    const a = saveItem('h1');
    const b = saveItem('h2');
    const c = saveItem('h3');
    const rails = tagRepo.create(db, 'rails', NOW);
    const dbTag = tagRepo.create(db, 'db', NOW);

    tagRepo.attach(db, a.id, rails.id, NOW);
    tagRepo.attach(db, a.id, dbTag.id, NOW);
    tagRepo.attach(db, b.id, rails.id, NOW);

    const result = tagRepo.listForItems(db, [a.id, b.id, c.id]);
    expect(result.get(a.id)?.map((t) => t.name)).toEqual(['db', 'rails']);
    expect(result.get(b.id)?.map((t) => t.name)).toEqual(['rails']);
    expect(result.get(c.id)).toBeUndefined();
  });

  it('空配列ならクエリを投げずに空を返す', () => {
    expect(tagRepo.listForItems(db, []).size).toBe(0);
  });
});

describe('listRecentlyUsed（Share Extension のチップ）', () => {
  it('直近で使われた順に最大 5 件返す', () => {
    const item = saveItem('h1');
    const names = ['t1', 't2', 't3', 't4', 't5', 't6'];
    names.forEach((name, i) => {
      const tag = tagRepo.create(db, name, NOW);
      tagRepo.attach(db, item.id, tag.id, new Date(NOW.getTime() + i * 1000));
    });

    const recent = tagRepo.listRecentlyUsed(db);
    expect(recent).toHaveLength(tagRepo.RECENT_TAG_LIMIT);
    expect(recent.map((t) => t.name)).toEqual(['t6', 't5', 't4', 't3', 't2']);
  });

  it('一度も使われていないタグは含まない', () => {
    tagRepo.create(db, 'unused', NOW);
    expect(tagRepo.listRecentlyUsed(db)).toEqual([]);
  });
});

describe('listWithUsage（タグ管理画面）', () => {
  it('使用件数つきで返す。未使用は 0', () => {
    const a = saveItem('h1');
    const b = saveItem('h2');
    const rails = tagRepo.create(db, 'rails', NOW);
    tagRepo.create(db, 'unused', NOW);
    tagRepo.attach(db, a.id, rails.id, NOW);
    tagRepo.attach(db, b.id, rails.id, NOW);

    expect(tagRepo.listWithUsage(db)).toEqual([
      expect.objectContaining({ name: 'rails', usageCount: 2 }),
      expect.objectContaining({ name: 'unused', usageCount: 0 }),
    ]);
  });
});
