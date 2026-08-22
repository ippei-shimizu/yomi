/**
 * 環境変数から取る設定（docs/DesignDoc.md §7.2）。
 *
 * `EXPO_PUBLIC_` 接頭辞の値はバンドルに埋め込まれる。**秘密にすべき値は
 * 置かない。** ここに置くのはクライアント用の公開キーのみで、いずれも
 * 未設定なら該当機能を無効にする（R-SEC10）。
 */
export const config = {
  posthog: {
    apiKey: process.env.EXPO_PUBLIC_POSTHOG_API_KEY ?? '',
    host: process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
  },
  sentry: {
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
  },
  revenueCat: {
    apiKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '',
  },
} as const;
