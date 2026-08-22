import { operatorValue, OPERATOR } from '../operator';
import type { LegalDocument } from '../types';

/**
 * 利用規約（英語）。ja/terms.ts の訳。
 *
 * **条項を足すときは両方を直す。** 片方だけ直すと、言語によって
 * 契約内容が違うことになる。
 */
export function termsOfServiceEn(): LegalDocument {
  return {
    id: 'terms',
    title: 'Terms of Service',
    updatedAt: '2026-08-22',
    sections: [
      {
        heading: '1. Scope',
        blocks: [
          {
            kind: 'paragraph',
            text: `These terms govern your use of the application “Yomi” (the “App”), provided by ${operatorValue(OPERATOR.name)} (“we”, “us”). By using the App you agree to these terms.`,
          },
        ],
      },
      {
        heading: '2. What the App does',
        blocks: [
          {
            kind: 'paragraph',
            text: 'The App lets you save articles to read later and keep track of what you have read. What you save is stored only on your device and is not sent to our servers.',
          },
        ],
      },
      {
        heading: '3. Your data and its loss',
        blocks: [
          {
            kind: 'paragraph',
            text: 'The App stores data only on your device. We have no backup and no means of recovery.',
          },
          {
            kind: 'list',
            items: [
              'Your data is lost if the device breaks or is lost, if the App is deleted, or if the OS is reset',
              'Data is not carried over automatically when you change devices',
              'Export your data from the settings screen and keep the file yourself if you need it',
            ],
          },
          {
            kind: 'paragraph',
            text: 'We are not liable for the loss of your data.',
          },
        ],
      },
      {
        heading: '4. Responsibility for what you save',
        blocks: [
          {
            kind: 'paragraph',
            text: 'You are responsible for the URLs you save and for how you handle their contents. We are not responsible for the contents of any website you save.',
          },
        ],
      },
      {
        heading: '5. Prohibited conduct',
        blocks: [
          {
            kind: 'paragraph',
            text: 'You must not do any of the following when using the App.',
          },
          {
            kind: 'list',
            items: [
              'Violate any law or public order',
              'Analyze, modify, copy, or redistribute the App',
              'Use the App to place an excessive load on a third party’s servers',
              'Improperly circumvent the limits on paid features',
            ],
          },
        ],
      },
      {
        heading: '6. Paid plans',
        blocks: [
          {
            kind: 'paragraph',
            text: 'The App offers a paid plan, “Yomi Pro”. Purchase, payment, and cancellation are all handled through Apple’s App Store.',
          },
          {
            kind: 'list',
            items: [
              'The monthly and yearly plans renew automatically unless cancelled',
              'To stop automatic renewal, cancel at least 24 hours before the end of the current period in your App Store settings',
              'If you cancel during a free trial, you are not charged',
              'The lifetime plan does not renew',
              'Refunds follow Apple’s rules. We cannot decide whether a refund is granted',
            ],
          },
          {
            kind: 'paragraph',
            text: 'See the Commercial Transactions disclosure and the purchase screen for prices and details.',
          },
        ],
      },
      {
        heading: '7. Changes, suspension, and discontinuation',
        blocks: [
          {
            kind: 'paragraph',
            text: 'We may change the App or stop providing it without prior notice. If we discontinue it, we will make reasonable efforts to give notice in advance.',
          },
        ],
      },
      {
        heading: '8. Disclaimer',
        blocks: [
          {
            kind: 'paragraph',
            text: 'The App is provided as is. We do not warrant that it fits any particular purpose of yours, nor that it will be free of defects. We are not liable for damages arising from your use of the App, except in cases of our wilful misconduct or gross negligence.',
          },
        ],
      },
      {
        heading: '9. Changes to these terms',
        blocks: [
          {
            kind: 'paragraph',
            text: 'We may change these terms. The revised terms take effect when they are shown on this screen.',
          },
        ],
      },
      {
        heading: '10. Governing law and jurisdiction',
        blocks: [
          {
            kind: 'paragraph',
            text: 'These terms are governed by the laws of Japan. Any dispute concerning the App shall be subject to the exclusive jurisdiction of the court having jurisdiction over our address, as the court of first instance.',
          },
        ],
      },
    ],
  };
}
