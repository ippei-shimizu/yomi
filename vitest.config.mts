import path from 'node:path';
import { defineConfig } from 'vitest/config';

/**
 * ユニットテストは pure function と Repository のみを対象にする
 * （docs/DesignDoc.md §8）。React Native のコンポーネントは対象外。
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // 実際のテストは #6（URL 正規化）以降で追加される
    passWithNoTests: true,
    // 週の起点・放置日数はローカルタイム依存。テストを実行環境の TZ に
    // 左右されないよう固定する。
    env: { TZ: 'Asia/Tokyo' },
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
      // 下記のコメントは test/shims/expo-crypto.ts を参照
      'expo-crypto': path.resolve(import.meta.dirname, './test/shims/expo-crypto.ts'),
    },
  },
});
