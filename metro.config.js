const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const { withShareExtension } = require('expo-share-extension/metro');

// Share Extension 用のバンドル（index.share.js）を解決できるようにする
const config = withShareExtension(getDefaultConfig(__dirname));

// drizzle のマイグレーション（.sql）を import できるようにする。
// babel-plugin-inline-import と対で機能する（babel.config.js を参照）。
config.resolver.sourceExts.push('sql');

module.exports = withNativeWind(config, { input: './src/ui/global.css' });
