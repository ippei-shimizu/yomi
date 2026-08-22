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

/**
 * Extension が import してよい src/ 配下のツリー。
 *
 * ESLint のパターンは gitignore と同じ規則で、**除外されたツリーの中の
 * 1 ファイルだけを再包含することはできない**。そのためデザイントークンは
 * src/ui/（コンポーネントを含む）ではなく独立した src/design/ に置き、
 * ツリーごと許可している。
 */
const shareExtensionAllowedTrees = ['@/db', '@/domain/url', '@/design'];

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
                // '@/domain' 自体も許可しないと '@/domain/url' を再包含できない
                ...shareExtensionAllowedTrees.flatMap((tree) =>
                  tree === '@/domain/url'
                    ? ['!@/domain', `!${tree}`, `!${tree}/**`]
                    : [`!${tree}`, `!${tree}/**`],
                ),
              ],
              message: `share-extension/ からは ${shareExtensionAllowedTrees.join('・')} のみ import できます（docs/DesignDoc.md §3.1）。`,
            },
          ],
        },
      ],
    },
  },
]);
