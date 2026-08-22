import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * 画面のコードに直書きされた日本語が残っていないことを検査する。
 *
 * 型は「en に翻訳が存在すること」しか保証しない。キーを経由せず日本語を
 * 直接書いた箇所は型では捕まらず、英語表示のときだけ日本語が出る。
 * その取りこぼしをここで落とす。
 */

/** 画面に出る文字列を持つツリー */
const SCANNED = ['src/app', 'src/features', 'src/ui', 'share-extension'];

/**
 * 日本語のままでよい場所。
 *
 * - 文言の定義元そのもの
 * - 法務文書の日本語版（言語ごとに 1 つの文書として持つ）
 */
const ALLOWED = [join('src', 'lib', 'i18n', 'messages'), join('src', 'features', 'legal', 'ja')];

const JAPANESE = /[぀-ヿ㐀-鿿]/;

function sourceFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      found.push(...sourceFiles(path));
    } else if (/\.tsx?$/.test(entry) && !entry.includes('.test.')) {
      found.push(path);
    }
  }
  return found;
}

/** 文字列リテラルの中身は残し、コメントだけを落とす */
function stripComments(source: string): string {
  const out: string[] = [];
  let index = 0;

  while (index < source.length) {
    const char = source[index] ?? '';

    if (char === '/' && source[index + 1] === '*') {
      const end = source.indexOf('*/', index + 2);
      index = end < 0 ? source.length : end + 2;
      out.push(' ');
      continue;
    }
    if (char === '/' && source[index + 1] === '/') {
      const end = source.indexOf('\n', index);
      index = end < 0 ? source.length : end;
      out.push(' ');
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      const quote = char;
      out.push(char);
      index += 1;
      while (index < source.length) {
        if (source[index] === '\\') {
          out.push(source.slice(index, index + 2));
          index += 2;
          continue;
        }
        const current = source[index] ?? '';
        out.push(current);
        index += 1;
        if (current === quote) break;
      }
      continue;
    }

    out.push(char);
    index += 1;
  }

  return out.join('');
}

function japaneseIn(source: string): string[] {
  const code = stripComments(source);
  const found: string[] = [];

  for (const match of code.matchAll(/(['"`])((?:\\.|(?!\1).)*)\1/gs)) {
    const text = match[2] ?? '';
    if (JAPANESE.test(text)) found.push(text.trim().slice(0, 60));
  }
  // JSX のテキストノード
  for (const match of code.matchAll(/>\s*([^<>{}\n][^<>{}]*?)\s*</g)) {
    const text = match[1] ?? '';
    if (JAPANESE.test(text)) found.push(text.trim().slice(0, 60));
  }

  return found;
}

describe('未翻訳の直書き', () => {
  const files = SCANNED.flatMap(sourceFiles).filter(
    (path) => !ALLOWED.some((allowed) => path.startsWith(allowed)),
  );

  it('走査対象のファイルが見つかっている（パスの typo で素通りしない）', () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it('画面のコードに日本語が直書きされていない', () => {
    const offenders = files
      .map((path) => ({ path, hits: japaneseIn(readFileSync(path, 'utf8')) }))
      .filter((entry) => entry.hits.length > 0)
      .map((entry) => `${entry.path}: ${entry.hits.join(' / ')}`);

    expect(offenders).toEqual([]);
  });
});
