module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
    // react-native-reanimated v4 はこのプラグインを最後に置く必要がある
    plugins: ['react-native-worklets/plugin'],
  };
};
