import type { ExpoConfig } from 'expo/config';

/**
 * iOS 専用アプリ。Android / iPad は対象外のため
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
      // src/db/appGroup.ts の APP_GROUP と一致させること。
      // Expo の設定ローダは相対 TS import を解決できないため直接書いているが、
      // 食い違いは app.config.test.ts が検出する。
      'com.apple.security.application-groups': ['group.jp.ippei.yomi'],
    },
    infoPlist: {
      UIBackgroundModes: ['fetch', 'processing'],
      // 対応言語の宣言。これが無いと iOS の「言語」設定にアプリが現れず、
      // 端末の言語も日本語として解決されない
      CFBundleLocalizations: ['ja', 'en'],
      CFBundleDevelopmentRegion: 'ja',
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
        // Extension のバンドルから除外する。依存の制限を
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
