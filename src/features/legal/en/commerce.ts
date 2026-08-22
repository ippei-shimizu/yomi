import { MINIMUM_IOS_VERSION } from '@/features/legal/requirements';
import { PLANS } from '@/features/paywall/copy';
import type { Translate } from '@/lib/i18n';

import { operatorValue, OPERATOR } from '../operator';
import type { LegalDocument } from '../types';

/**
 * 特定商取引法に基づく表記（英語）。
 *
 * 日本の法令に基づく表記なので、英語版でも項目は落とさない。
 * 価格は Paywall と同じ PLANS から組み立てる。
 */
function priceLines(t: Translate): string {
  return PLANS.map((plan) => `${t(plan.labelKey)} ${t(plan.fallbackPriceKey)}`).join('\n');
}

export function commerceDisclosureEn(t: Translate): LegalDocument {
  return {
    id: 'commerce',
    title: 'Commercial Transactions Disclosure',
    updatedAt: '2026-08-22',
    sections: [
      {
        heading: 'Seller',
        blocks: [
          {
            kind: 'entries',
            items: [
              { term: 'Seller', value: operatorValue(OPERATOR.name) },
              { term: 'Representative', value: operatorValue(OPERATOR.representative) },
              { term: 'Address', value: operatorValue(OPERATOR.address) },
              { term: 'Telephone', value: operatorValue(OPERATOR.phone) },
              { term: 'Email', value: operatorValue(OPERATOR.email) },
            ],
          },
        ],
      },
      {
        heading: 'Price',
        blocks: [
          { kind: 'paragraph', text: priceLines(t) },
          {
            kind: 'paragraph',
            text: 'All prices include tax. The price shown in the App Store is what you are charged.',
          },
        ],
      },
      {
        heading: 'Additional costs',
        blocks: [
          {
            kind: 'paragraph',
            text: 'You are responsible for the cost of your internet connection.',
          },
        ],
      },
      {
        heading: 'Payment method and timing',
        blocks: [
          {
            kind: 'entries',
            items: [
              { term: 'Payment method', value: 'Payment through Apple’s App Store' },
              {
                term: 'When you are charged',
                value:
                  'The monthly and yearly plans are charged at purchase and on each renewal date. For a plan with a free trial, the first charge is at the end of the trial. The lifetime plan is charged once, at purchase.',
              },
            ],
          },
        ],
      },
      {
        heading: 'Delivery',
        blocks: [
          {
            kind: 'paragraph',
            text: 'Paid features become available immediately once payment completes.',
          },
        ],
      },
      {
        heading: 'Cancellation and refunds',
        blocks: [
          {
            kind: 'list',
            items: [
              'To stop automatic renewal, cancel at least 24 hours before the end of the current period in your App Store settings',
              'Because this is digital content, we cannot accept returns after purchase',
              'Refunds follow Apple’s rules and are decided by Apple. We cannot process them',
            ],
          },
        ],
      },
      {
        heading: 'Requirements',
        blocks: [
          {
            kind: 'paragraph',
            text: `iPhone running iOS ${MINIMUM_IOS_VERSION} or later.`,
          },
        ],
      },
    ],
  };
}
