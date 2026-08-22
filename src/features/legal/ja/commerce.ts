import { MINIMUM_IOS_VERSION } from '@/features/legal/requirements';
import { PLANS } from '@/features/paywall/copy';
import type { Translate } from '@/lib/i18n';

import { operatorValue, OPERATOR } from '../operator';
import type { LegalDocument } from '../types';

/**
 * 特定商取引法に基づく表記。
 *
 * 価格は Paywall と同じ PLANS から組み立てる。表記と購入画面で
 * 価格が食い違うのは審査の指摘対象になるため、二重に書かない。
 */
function priceLines(t: Translate): string {
  return PLANS.map((plan) => `${t(plan.labelKey)} ${t(plan.fallbackPriceKey)}`).join('\n');
}

export function commerceDisclosureJa(t: Translate): LegalDocument {
  return {
    id: 'commerce',
    title: '特定商取引法に基づく表記',
    updatedAt: '2026-08-22',
    sections: [
      {
        heading: '事業者',
        blocks: [
          {
            kind: 'entries',
            items: [
              { term: '販売業者', value: operatorValue(OPERATOR.name) },
              { term: '運営統括責任者', value: operatorValue(OPERATOR.representative) },
              { term: '所在地', value: operatorValue(OPERATOR.address) },
              { term: '電話番号', value: operatorValue(OPERATOR.phone) },
              { term: 'メールアドレス', value: operatorValue(OPERATOR.email) },
            ],
          },
        ],
      },
      {
        heading: '販売価格',
        blocks: [
          { kind: 'paragraph', text: priceLines(t) },
          {
            kind: 'paragraph',
            text: '価格はすべて税込みです。App Store の表示価格が実際の請求額となります。',
          },
        ],
      },
      {
        heading: '対価以外に必要な費用',
        blocks: [
          {
            kind: 'paragraph',
            text: 'インターネット接続にかかる通信料は利用者の負担となります。',
          },
        ],
      },
      {
        heading: '支払方法と支払時期',
        blocks: [
          {
            kind: 'entries',
            items: [
              { term: '支払方法', value: 'Apple の App Store を通じた決済' },
              {
                term: '支払時期',
                value:
                  '月額・年額プランは購入時および各更新日に課金されます。無料トライアル付きのプランは、トライアル期間の終了時が初回の課金となります。買い切りプランは購入時に一度だけ課金されます。',
              },
            ],
          },
        ],
      },
      {
        heading: '引渡時期',
        blocks: [
          {
            kind: 'paragraph',
            text: '決済完了後、ただちに有料機能をご利用いただけます。',
          },
        ],
      },
      {
        heading: '解約・返金',
        blocks: [
          {
            kind: 'list',
            items: [
              '自動更新の停止は、現在の期間終了の 24 時間以上前に App Store の設定から行ってください',
              'デジタルコンテンツの性質上、購入後の返品には応じられません',
              '返金は Apple の定めに従い、Apple が判断します。当方では対応できません',
            ],
          },
        ],
      },
      {
        heading: '動作環境',
        blocks: [
          {
            kind: 'paragraph',
            text: `iOS ${MINIMUM_IOS_VERSION} 以降を搭載した iPhone。`,
          },
        ],
      },
    ],
  };
}
