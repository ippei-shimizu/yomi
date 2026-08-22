import type { ExpoConfig } from 'expo/config';

/**
 * iOS 専用アプリ（docs/PRD.md §1）。Android / iPad は対象外のため
 * android / web の設定は持たない。
 *
 * ios/ は git 管理せず、この設定から prebuild で生成する
 * （Continuous Native Generation）。
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
    entitlements: {
      'com.apple.security.application-groups': ['group.jp.ippei.yomi'],
    },
    infoPlist: {
      UIBackgroundModes: ['fetch', 'processing'],
    },
  },
  plugins: [
    'expo-router',
    [
      'expo-share-extension',
      {
        // プラグインが NSExtensionActivationRule に変換する。
        // url -> NSExtensionActivationSupportsWebURLWithMaxCount
        // text -> NSExtensionActivationSupportsText
        activationRules: [{ type: 'url', max: 1 }, { type: 'text' }],
        backgroundColor: { red: 243, green: 244, blue: 248, alpha: 1 },
        height: 260,
        // Extension のバンドルから除外する。docs/DesignDoc.md §3.1 の依存ルールを
        // ESLint（静的検査）だけでなくビルド側でも担保する。
        excludedPackages: [
          'react-native-purchases',
          'posthog-react-native',
          '@sentry/react-native',
        ],
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
};

export default config;
