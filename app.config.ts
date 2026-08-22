import type { ExpoConfig } from 'expo/config';

/**
 * iOS 専用アプリ（docs/PRD.md §1）。Android / iPad は対象外のため
 * android / web の設定は持たない。
 *
 * App Group・Share Extension・Background Modes の設定は #2 で追加する。
 */
const config: ExpoConfig = {
  name: 'Yomi',
  slug: 'yomi',
  version: '0.1.0',
  orientation: 'portrait',
  scheme: 'yomi',
  userInterfaceStyle: 'automatic',
  icon: './assets/icon.png',
  platforms: ['ios'],
  ios: {
    bundleIdentifier: 'jp.ippei.yomi',
    supportsTablet: false,
    deploymentTarget: '17.0',
  },
  plugins: ['expo-router'],
  experiments: {
    typedRoutes: true,
  },
};

export default config;
