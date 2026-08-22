import type { Locale, Translate } from '@/lib/i18n';

import { commerceDisclosureEn } from './en/commerce';
import { privacyPolicyEn } from './en/privacy';
import { termsOfServiceEn } from './en/terms';
import { commerceDisclosureJa } from './ja/commerce';
import { privacyPolicyJa } from './ja/privacy';
import { termsOfServiceJa } from './ja/terms';
import type { LegalDocument, LegalDocumentId } from './types';

/**
 * 法務文書は i18n のキーではなく、言語ごとに 1 つの文書として持つ。
 *
 * 条項を細かいキーに割ると、文書として読めなくなり、法的な見直しができない。
 * 代わりに「同じ言語で同じ節が揃っているか」をテストで固定する。
 */
const BUILDERS: Record<Locale, Record<LegalDocumentId, (t: Translate) => LegalDocument>> = {
  ja: {
    terms: termsOfServiceJa,
    privacy: privacyPolicyJa,
    commerce: commerceDisclosureJa,
  },
  en: {
    terms: termsOfServiceEn,
    privacy: privacyPolicyEn,
    commerce: commerceDisclosureEn,
  },
};

export function legalDocument(t: Translate, locale: Locale, id: LegalDocumentId): LegalDocument {
  return BUILDERS[locale][id](t);
}

export * from './types';
