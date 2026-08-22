module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
    plugins: [
      // drizzle のマイグレーション .sql を文字列としてインライン展開する
      ['inline-import', { extensions: ['.sql'] }],
      // react-native-reanimated v4 はこのプラグインを最後に置く必要がある
      'react-native-worklets/plugin',
    ],
  };
};
