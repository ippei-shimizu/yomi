import { operatorValue, OPERATOR } from '../operator';
import type { LegalDocument } from '../types';

/**
 * プライバシーポリシー（英語）。ja/privacy.ts の訳。
 *
 * **記載と実装が食い違うと審査で落ちるだけでなく、虚偽の説明になる。**
 * 送信先を増やす・イベントを追加するときは、日英どちらも直す。
 */
export function privacyPolicyEn(): LegalDocument {
  return {
    id: 'privacy',
    title: 'Privacy Policy',
    updatedAt: '2026-08-22',
    sections: [
      {
        heading: 'In short',
        blocks: [
          {
            kind: 'paragraph',
            text: 'Yomi does not send the contents of what you save anywhere. The URLs, titles, notes, tags, and read history you create are stored only on your device. We cannot see them.',
          },
          {
            kind: 'paragraph',
            text: 'There is no account. We do not collect anything that identifies you personally, so we cannot follow the same person across devices either.',
          },
        ],
      },
      {
        heading: 'Stored only on your device',
        blocks: [
          {
            kind: 'list',
            items: [
              'The URL, title, site name, author, and thumbnail URL of each saved article',
              'The notes and tags you write',
              'When you saved and read each item, and whether it is unread, read, or archived',
              'App settings such as notification times and theme',
            ],
          },
          {
            kind: 'paragraph',
            text: 'Deleting the App removes all of it from your device. None of it is sent to our servers and none of it is backed up by us. Export it from the settings screen if you need a copy.',
          },
        ],
      },
      {
        heading: 'Fetching article details',
        blocks: [
          {
            kind: 'paragraph',
            text: 'To show titles and thumbnails, the App requests the saved URL directly from your device. That request does not pass through our servers. The website you saved will, however, see an ordinary access log entry, just as it would from a browser.',
          },
        ],
      },
      {
        heading: 'What we send to third parties',
        blocks: [
          {
            kind: 'paragraph',
            text: 'To improve the App and fix problems, we send the following and nothing else. None of it contains URLs, titles, or notes.',
          },
          {
            kind: 'entries',
            items: [
              {
                term: 'Usage analytics (PostHog)',
                value:
                  'Anonymous events only. We send six of them: “saved” (the kind of source), “read” (days between saving and reading), “archived”, “opened from a notification”, “viewed the purchase screen” (what prompted it), and “completed a purchase” (which plan). Estimating your region from your IP address is disabled.',
              },
              {
                term: 'Crash reports (Sentry)',
                value:
                  'Technical details of an abnormal termination (where it happened, device model, OS version). URLs, titles, notes, and search terms are stripped before sending. We do not send device identifiers or contact details.',
              },
              {
                term: 'Purchases (RevenueCat / Apple)',
                value:
                  'What is needed to confirm your paid plan. Payment details such as card numbers are handled by Apple; neither the App nor we receive them.',
              },
            ],
          },
          {
            kind: 'paragraph',
            text: 'We do not provide your information to any other third party.',
          },
        ],
      },
      {
        heading: 'Notifications',
        blocks: [
          {
            kind: 'paragraph',
            text: 'All notifications are local: they are composed and scheduled on your device. Their contents are never sent anywhere, and we do not obtain a push notification token.',
          },
        ],
      },
      {
        heading: 'Children',
        blocks: [
          {
            kind: 'paragraph',
            text: 'The App is not directed at any particular age group, and it does not collect information that identifies a person.',
          },
        ],
      },
      {
        heading: 'Changes to this policy',
        blocks: [
          {
            kind: 'paragraph',
            text: 'If we change what information is sent, we will revise this policy and update the App. The revised policy applies from the moment it is shown on this screen.',
          },
        ],
      },
      {
        heading: 'Contact',
        blocks: [
          {
            kind: 'entries',
            items: [
              { term: 'Operator', value: operatorValue(OPERATOR.name) },
              { term: 'Contact', value: operatorValue(OPERATOR.email) },
            ],
          },
        ],
      },
    ],
  };
}
