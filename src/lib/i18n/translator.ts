import type { Locale } from './locale';
import { MESSAGES } from './messages';
import { interpolate, pluralKey, type TranslateParams } from './translate';
import type { MessageKey, Messages } from './types';

/** 文言を引く関数。画面はこれだけを使う */
export type Translate = (key: MessageKey, params?: TranslateParams) => string;

/**
 * 指定した言語の翻訳関数を作る。react-native を import しない純粋モジュール。
 *
 * キーが見つからない場合はキー自体を返す。空文字を返すと、画面から文言が
 * 消えた原因を追えなくなる。型で防いでいるので通常は起こらない。
 */
export function createTranslate(locale: Locale): Translate {
  const messages: Messages = MESSAGES[locale];
  const has = (candidate: string) => messages[candidate] !== undefined;

  return (key, params) => {
    const resolved = pluralKey(key, params, has);
    const template = messages[resolved] ?? messages[key];
    return template === undefined ? key : interpolate(template, params);
  };
}
