/**
 * CSV の組み立て。
 * react-native を import しない純粋モジュール。
 *
 * RFC 4180 に従う。メモにカンマ・改行・引用符が入ることは日常的にあるため、
 * ここを雑にすると壊れたファイルが出力される。
 */

/** 1 セルをエスケープする。区切り・改行・引用符を含むなら引用符で囲う */
export function escapeCsvField(value: string): string {
  if (!/[",\r\n]/.test(value)) return value;
  return `"${value.replace(/"/g, '""')}"`;
}

export function toCsvRow(fields: readonly (string | null | undefined)[]): string {
  return fields.map((field) => escapeCsvField(field ?? '')).join(',');
}

/**
 * Excel / Numbers が UTF-8 と判定できるよう BOM を付ける。
 * 付けないと日本語のメモが文字化けする。
 */
export const UTF8_BOM = '﻿';
