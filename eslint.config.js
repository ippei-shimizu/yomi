const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

/**
 * share-extension/ の依存制限は docs/DesignDoc.md §3.1 の依存ルールを
 * 機械的に強制するためのもの。iOS Extension のメモリ上限（~120MB）と
 * 起動 2 秒以内の要件を守るため、バンドルに含めてよいものを絞る。
 */
const shareExtensionForbiddenPackages = [
  'react-native-purchases',
  'posthog-react-native',
  '@sentry/react-native',
];

module.exports = defineConfig([
  expoConfig,
  prettierConfig,
  {
    ignores: ['node_modules/**', 'ios/**', 'android/**', '.expo/**', 'dist/**'],
  },
  {
    settings: {
      'import/resolver': {
        typescript: { project: './tsconfig.json' },
      },
    },
  },
  {
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../../*'],
              message: '2 階層以上さかのぼる相対 import は使わず @/ エイリアスを使ってください。',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['share-extension/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: shareExtensionForbiddenPackages.map((name) => ({
            name,
            message:
              'share-extension/ にこのパッケージを入れないでください（docs/DesignDoc.md §3.1 / §5.1）。',
          })),
          patterns: [
            {
              group: [
                '@/**',
                '!@/db',
                '!@/db/**',
                '!@/domain',
                '!@/domain/url',
                '!@/domain/url/**',
              ],
              message:
                'share-extension/ からは @/db と @/domain/url のみ import できます（docs/DesignDoc.md §3.1）。',
            },
          ],
        },
      ],
    },
  },
]);
