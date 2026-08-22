# CI / CD

| workflow | トリガー | 内容 |
|---|---|---|
| `ci.yml` | PR / main への push | lint / typecheck / format / test / bundle |
| `build.yml` | main への push | `eas build --profile preview`（TestFlight 内部テスト） |
| `build.yml` | タグ `v*` | `eas build --profile production --auto-submit` |

## 必要な Secrets

| 名前 | 用途 |
|---|---|
| `EXPO_TOKEN` | EAS の認証。Expo のアクセストークン |

RevenueCat / PostHog / Sentry のキーは **EAS のシークレット**（`eas secret:create`）に置く。
`EXPO_PUBLIC_` の値はバンドルに埋め込まれるため、秘密にすべき値をここに入れない。

## ブランチ保護

`main` に対して以下を設定する（リポジトリの設定画面から）。

- `check` ジョブの成功を必須にする
- 直接 push を禁止し、PR 経由のみにする
