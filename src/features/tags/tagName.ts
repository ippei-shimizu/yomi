import type { Translate } from '@/lib/i18n';

/**
 * タグ名の正規化と検証。react-native を import しない純粋モジュール。
 *
 * フラットなタグのみ。階層は作らない。
 */

export const MAX_TAG_LENGTH = 24;

export type TagNameError = 'empty' | 'too-long' | 'duplicate';

export type TagNameResult = { ok: true; name: string } | { ok: false; error: TagNameError };

/** 前後の空白と連続空白を整える。大文字小文字は保持する */
export function normalizeTagName(input: string): string {
  return input.replace(/\s+/g, ' ').trim();
}

/**
 * 入力を検証する。既存タグとの重複は**大文字小文字を無視して**判定する。
 * 「Rails」と「rails」が別タグとして並ぶと、どちらに付けたか分からなくなるため。
 */
export function validateTagName(input: string, existingNames: readonly string[]): TagNameResult {
  const name = normalizeTagName(input);
  if (name.length === 0) return { ok: false, error: 'empty' };
  if (name.length > MAX_TAG_LENGTH) return { ok: false, error: 'too-long' };

  const lowered = name.toLowerCase();
  if (existingNames.some((existing) => existing.toLowerCase() === lowered)) {
    return { ok: false, error: 'duplicate' };
  }

  return { ok: true, name };
}

export function tagNameErrorMessage(t: Translate, error: TagNameError): string {
  switch (error) {
    case 'empty':
      return t('tags.errorEmpty');
    case 'too-long':
      return t('tags.errorTooLong', { max: MAX_TAG_LENGTH });
    case 'duplicate':
      return t('tags.errorDuplicate');
  }
}
