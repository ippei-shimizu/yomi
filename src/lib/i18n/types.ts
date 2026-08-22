import type { ja } from './messages/ja';

/**
 * 文言のキー。ja.ts が定義元。
 *
 * `_one` / `_other` の接尾辞は複数形の内部表現なので、呼び出し側からは
 * 接尾辞を外したキーで参照する。
 */
type RawKey = keyof typeof ja;

type StripPlural<K extends string> = K extends `${infer Base}_one`
  ? Base
  : K extends `${infer Base}_other`
    ? Base
    : K;

export type MessageKey = StripPlural<RawKey>;

/**
 * 翻訳が持つべきキーの形。
 *
 * ja のキーは全て必須。en は `_one` を足してよいので、任意のキーも許す。
 */
export type Messages = { [K in RawKey]: string } & { [key: string]: string };
