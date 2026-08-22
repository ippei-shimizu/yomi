const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

/**
 * share-extension/ の依存制限は、バンドルに含めてよいものを
 * 機械的に強制するためのもの。iOS Extension のメモリ上限（~120MB）と
 * 起動 2 秒以内の要件を守るため、バンドルに含めてよいものを絞る。
 */
const shareExtensionForbiddenPackages = [
  'react-native-purchases',
  'posthog-react-native',
  '@sentry/react-native',
];

/**
 * Extension が import してよい src/ 配下のツリー。
 *
 * ESLint のパターンは gitignore と同じ規則で、**除外されたツリーの中の
 * 1 ファイルだけを再包含することはできない**。そのためデザイントークンは
 * src/ui/（コンポーネントを含む）ではなく独立した src/design/ に置き、
 * ツリーごと許可している。
 */
const shareExtensionAllowedTrees = ['@/db', '@/domain/url', '@/design', '@/lib/i18n'];

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
              // src/ 配下を相対パスで深く辿るのを防ぐ。
              // リポジトリルートの成果物（app.config / drizzle の生成物）には
              // @/ エイリアスが無いため例外として許可する。
              group: ['../../*', '!../../app.config', '!../../drizzle', '!../../drizzle/*'],
              message: '2 階層以上さかのぼる相対 import は使わず @/ エイリアスを使ってください。',
            },
          ],
        },
      ],
    },
  },
  {
    // 設計原則 4: Pro 判定を 1 箇所に集約する。
    // 判定が散ると Dev override との整合が取れず、上限判定にも抜けが出る。
    files: ['src/**/*.{ts,tsx}', 'share-extension/**/*.{ts,tsx}'],
    ignores: ['src/domain/entitlement/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react-native-purchases',
              message:
                'RevenueCat は src/domain/entitlement/ の中だけで参照してください。画面からは useEntitlement() を使ってください。',
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
            message: 'share-extension/ にこのパッケージを入れないでください。',
          })),
          patterns: [
            {
              group: [
                '@/**',
                // '@/domain' 自体も許可しないと '@/domain/url' を再包含できない
                // 入れ子のツリーを許可するには、親も一度再包含する必要がある
                ...shareExtensionAllowedTrees.flatMap((tree) => {
                  const parent = tree.split('/').slice(0, -1).join('/');
                  const reinclude = tree.includes('/', '@/'.length) ? [`!${parent}`] : [];
                  return [...reinclude, `!${tree}`, `!${tree}/**`];
                }),
              ],
              message: `share-extension/ からは ${shareExtensionAllowedTrees.join('・')} のみ import できます。`,
            },
          ],
        },
      ],
    },
  },
]);
