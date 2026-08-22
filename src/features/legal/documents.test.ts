import { describe, expect, it } from 'vitest';

import { PLANS } from '@/features/paywall/copy';

import { COMMERCE_DISCLOSURE, legalDocument, PRIVACY_POLICY } from './documents';
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

function fullTextOf(id: (typeof LEGAL_DOCUMENT_IDS)[number]): string {
  return legalDocument(id)
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

describe('法務文書', () => {
  it('3 つとも引ける', () => {
    for (const id of LEGAL_DOCUMENT_IDS) {
      const document = legalDocument(id);
      expect(document.id).toBe(id);
      expect(document.title.length).toBeGreaterThan(0);
      expect(document.sections.length).toBeGreaterThan(0);
    }
  });

  it('空の見出し・空の本文が無い', () => {
    for (const id of LEGAL_DOCUMENT_IDS) {
      for (const section of legalDocument(id).sections) {
        expect(section.heading.trim().length).toBeGreaterThan(0);
        expect(section.blocks.length).toBeGreaterThan(0);
        expect(textOf(section.blocks).trim().length).toBeGreaterThan(0);
      }
    }
  });
});

describe('特定商取引法に基づく表記', () => {
  // 記載が欠けると審査を通らない項目
  it.each(['販売業者', '運営統括責任者', '所在地', '電話番号', 'メールアドレス'])(
    '%s の欄がある',
    (term) => {
      expect(fullTextOf('commerce')).toContain(term);
    },
  );

  it.each(['販売価格', '支払方法', '支払時期', '引渡時期', '解約', '動作環境'])(
    '%s に触れている',
    (keyword) => {
      expect(fullTextOf('commerce')).toContain(keyword);
    },
  );

  it('価格を Paywall と同じ PLANS から組み立てている（二重管理しない）', () => {
    const text = fullTextOf('commerce');
    for (const plan of PLANS) {
      expect(text).toContain(plan.fallbackPrice);
    }
  });

  it('事業者情報が未記入なら、その旨が画面に出る', () => {
    // 提出前に気づけることが目的。記入済みになればこの分岐は通らない
    const unfilled = unfilledOperatorFields();
    if (unfilled.length > 0) {
      expect(COMMERCE_DISCLOSURE.sections[0]).toBeDefined();
      expect(fullTextOf('commerce')).toContain(UNFILLED);
    } else {
      expect(fullTextOf('commerce')).not.toContain(UNFILLED);
      expect(fullTextOf('commerce')).toContain(OPERATOR.name);
    }
  });
});

describe('プライバシーポリシー', () => {
  it('実装で送信している 3 つの送信先すべてに触れている', () => {
    const text = fullTextOf('privacy');
    expect(text).toContain('PostHog');
    expect(text).toContain('Sentry');
    expect(text).toContain('RevenueCat');
  });

  it('URL・タイトル・メモを送らないことを明記している', () => {
    const text = fullTextOf('privacy');
    expect(text).toContain('URL');
    expect(text).toContain('メモ');
    expect(text).toContain('外部に送信しません');
  });

  it('端末内にのみ保存することを明記している', () => {
    expect(fullTextOf('privacy')).toContain('端末内');
  });

  it('id と title が privacy のもの', () => {
    expect(PRIVACY_POLICY.id).toBe('privacy');
    expect(PRIVACY_POLICY.title).toBe('プライバシーポリシー');
  });
});
