import { describe, expect, it } from 'vitest';

import { PLANS } from '@/features/paywall/copy';
import { createTranslate, LOCALES, type Locale } from '@/lib/i18n';

import { legalDocument } from './documents';
import { OPERATOR, unfilledOperatorFields, UNFILLED } from './operator';
import { LEGAL_DOCUMENT_IDS, parseLegalDocumentId, type LegalBlock } from './types';

function textOf(blocks: readonly LegalBlock[]): string {
  return blocks
    .map((block) => {
      if (block.kind === 'paragraph') return block.text;
      if (block.kind === 'list') return block.items.join('\n');
      return block.items.map((entry) => `${entry.term}\n${entry.value}`).join('\n');
    })
    .join('\n');
}

function documentOf(locale: Locale, id: (typeof LEGAL_DOCUMENT_IDS)[number]) {
  return legalDocument(createTranslate(locale), locale, id);
}

function fullTextOf(locale: Locale, id: (typeof LEGAL_DOCUMENT_IDS)[number]): string {
  return documentOf(locale, id)
    .sections.map((section) => `${section.heading}\n${textOf(section.blocks)}`)
    .join('\n');
}

describe('parseLegalDocumentId', () => {
  it('既知の ID をそのまま返す', () => {
    for (const id of LEGAL_DOCUMENT_IDS) {
      expect(parseLegalDocumentId(id)).toBe(id);
    }
  });

  it('未知・未指定は利用規約に倒す（空白の画面を出さない）', () => {
    expect(parseLegalDocumentId(undefined)).toBe('terms');
    expect(parseLegalDocumentId('')).toBe('terms');
    expect(parseLegalDocumentId('tokushoho')).toBe('terms');
  });
});

describe.each(LOCALES)('法務文書 (%s)', (locale: Locale) => {
  it('3 つとも引ける', () => {
    for (const id of LEGAL_DOCUMENT_IDS) {
      const document = documentOf(locale, id);
      expect(document.id).toBe(id);
      expect(document.title.length).toBeGreaterThan(0);
      expect(document.sections.length).toBeGreaterThan(0);
    }
  });

  it('空の見出し・空の本文が無い', () => {
    for (const id of LEGAL_DOCUMENT_IDS) {
      for (const section of documentOf(locale, id).sections) {
        expect(section.heading.trim().length).toBeGreaterThan(0);
        expect(section.blocks.length).toBeGreaterThan(0);
        expect(textOf(section.blocks).trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('価格を Paywall と同じ PLANS から組み立てている（二重管理しない）', () => {
    const t = createTranslate(locale);
    const text = fullTextOf(locale, 'commerce');
    for (const plan of PLANS) {
      expect(text).toContain(t(plan.fallbackPriceKey));
    }
  });

  it('事業者情報が未記入なら、その旨が画面に出る', () => {
    // 提出前に気づけることが目的。記入済みになればこの分岐は通らない
    if (unfilledOperatorFields().length > 0) {
      expect(fullTextOf(locale, 'commerce')).toContain(UNFILLED);
    } else {
      expect(fullTextOf(locale, 'commerce')).not.toContain(UNFILLED);
      expect(fullTextOf(locale, 'commerce')).toContain(OPERATOR.name);
    }
  });

  it('プライバシーポリシーが送信先 3 つすべてに触れている', () => {
    const text = fullTextOf(locale, 'privacy');
    expect(text).toContain('PostHog');
    expect(text).toContain('Sentry');
    expect(text).toContain('RevenueCat');
  });
});

// 節の数がずれると、片方の言語にだけ条項がある状態になる
describe('日英で内容が対応している', () => {
  it.each(LEGAL_DOCUMENT_IDS)('%s の節の数が一致する', (id) => {
    expect(documentOf('en', id).sections.length).toBe(documentOf('ja', id).sections.length);
  });

  it.each(LEGAL_DOCUMENT_IDS)('%s の各節のブロック構成が一致する', (id) => {
    const kindsOf = (locale: Locale) =>
      documentOf(locale, id).sections.map((section) => section.blocks.map((block) => block.kind));

    expect(kindsOf('en')).toEqual(kindsOf('ja'));
  });

  it('特商法の必須項目が両言語にある', () => {
    const ja = fullTextOf('ja', 'commerce');
    const en = fullTextOf('en', 'commerce');

    for (const term of ['販売業者', '運営統括責任者', '所在地', '電話番号', 'メールアドレス']) {
      expect(ja).toContain(term);
    }
    for (const term of ['Seller', 'Representative', 'Address', 'Telephone', 'Email']) {
      expect(en).toContain(term);
    }
  });

  it('プライバシーポリシーが両言語で端末内保存を明記している', () => {
    expect(fullTextOf('ja', 'privacy')).toContain('端末内');
    expect(fullTextOf('en', 'privacy')).toContain('only on your device');
  });
});
