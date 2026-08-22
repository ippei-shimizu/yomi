import { describe, expect, it } from 'vitest';

import { scrubEvent, shouldDropBreadcrumb } from './scrub';

/**
 * 「個人特定情報・URL・タイトルは送らない」という方針の検証。
 * Sentry は例外メッセージや breadcrumb に値が紛れ込みやすいので、
 * 落ちていることをテストで固定する。
 */
describe('scrubEvent', () => {
  it('例外メッセージから URL を落とす', () => {
    const event = scrubEvent({
      exception: {
        values: [{ value: 'Failed to fetch https://zenn.dev/foo/articles/secret' }],
      },
    });

    const value = event.exception?.values?.[0]?.value ?? '';
    expect(value).not.toContain('zenn.dev');
    expect(value).toContain('[redacted]');
  });

  it('message から URL を落とす', () => {
    const event = scrubEvent({ message: 'open https://x.com/foo/status/1 failed' });
    expect(event.message).not.toContain('x.com');
  });

  it('breadcrumb の message から URL を落とす', () => {
    const event = scrubEvent({
      breadcrumbs: [{ message: 'navigate to https://qiita.com/a' }],
    });

    expect(event.breadcrumbs?.[0]?.message).not.toContain('qiita.com');
  });

  it.each(['url', 'originalUrl', 'title', 'memo', 'description', 'query'])(
    'breadcrumb の data.%s を伏せる',
    (key) => {
      const event = scrubEvent({
        breadcrumbs: [{ data: { [key]: '秘密の値', other: '残る' } }],
      });

      expect(event.breadcrumbs?.[0]?.data?.[key]).toBe('[redacted]');
      expect(event.breadcrumbs?.[0]?.data?.['other']).toBe('残る');
    },
  );

  // request にはクエリ文字列として URL が載ることがある
  it('request 情報ごと落とす', () => {
    const event = scrubEvent({ request: { url: 'https://zenn.dev/a' } });
    expect(event.request).toBeUndefined();
  });

  it('複数の URL をすべて落とす', () => {
    const event = scrubEvent({
      message: 'https://a.example/1 と https://b.example/2',
    });

    expect(event.message).not.toContain('example');
  });

  it('URL を含まない情報は残す（デバッグ可能性を保つ）', () => {
    const event = scrubEvent({
      exception: { values: [{ value: 'SQLITE_CONSTRAINT: UNIQUE constraint failed' }] },
    });

    expect(event.exception?.values?.[0]?.value).toContain('SQLITE_CONSTRAINT');
  });

  it('空のイベントでも壊れない', () => {
    expect(() => scrubEvent({})).not.toThrow();
  });
});

describe('shouldDropBreadcrumb', () => {
  // ネットワークの breadcrumb は URL そのものを持つ
  it.each(['xhr', 'fetch'])('%s の breadcrumb は捨てる', (category) => {
    expect(shouldDropBreadcrumb({ category })).toBe(true);
  });

  it.each(['navigation', 'ui.click', undefined])('%o は残す', (category) => {
    expect(shouldDropBreadcrumb({ category })).toBe(false);
  });
});
