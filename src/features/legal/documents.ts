import { COMMERCE_DISCLOSURE } from './commerce';
import { PRIVACY_POLICY } from './privacy';
import { TERMS_OF_SERVICE } from './terms';
import type { LegalDocument, LegalDocumentId } from './types';

const DOCUMENTS: Record<LegalDocumentId, LegalDocument> = {
  terms: TERMS_OF_SERVICE,
  privacy: PRIVACY_POLICY,
  commerce: COMMERCE_DISCLOSURE,
};

export function legalDocument(id: LegalDocumentId): LegalDocument {
  return DOCUMENTS[id];
}

export { COMMERCE_DISCLOSURE, PRIVACY_POLICY, TERMS_OF_SERVICE };
export * from './types';
