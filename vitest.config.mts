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
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
});
