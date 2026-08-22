# Yomi

エンジニア記事を「読み切る」ための後で読むアプリ（iOS）。

保存する場所ではなく、**消化する仕組み**を提供する。保存したものを一定期間内に読むか捨てるか判断させ、未読を溜めない状態を作る。

## ドキュメント

| ファイル | 内容 |
|---|---|
| [docs/PRD.md](docs/PRD.md) | 背景・スコープ・機能詳細・課金・リリース計画 |
| [docs/DesignDoc.md](docs/DesignDoc.md) | 技術スタック・アーキテクチャ・データモデル |
| [docs/Screens.md](docs/Screens.md) | 画面構成（S01–S14 / X01）と主要フロー |
| [docs/DesignGuideline.md](docs/DesignGuideline.md) | デザイントークン・タイポグラフィ・コンポーネント |

実装の進捗は [#31 実装ロードマップ](https://github.com/ippei-shimizu/yomi/issues/31) を参照。

## 必要なもの

- Node.js 22 以上
- iOS 実機での確認には macOS + Xcode（**Expo Go は使わない。dev build 前提**）

## セットアップ

```bash
npm install
npm run prebuild     # ios/ を生成（Continuous Native Generation）
npm run ios          # dev client を起動
```

## スクリプト

| コマンド | 内容 |
|---|---|
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest（pure function と Repository） |
| `npm run format` | Prettier（Markdown は対象外） |
| `npm run bundle:check` | iOS の JS バンドルが通るか確認（ネイティブビルド不要） |

## ディレクトリ構成

```
src/
├── app/          expo-router（画面）
├── db/           スキーマ・マイグレーション・Repository
├── domain/       URL 正規化 / メタ取得 / Pro 判定 / 通知 / エクスポート
├── features/     画面単位の hooks / components
├── ui/           共通コンポーネント・デザイントークン
└── lib/          analytics, sentry, config
share-extension/  Share Extension エントリ（最小依存）
```

`share-extension/` から import してよいのは `src/db/` と `src/domain/url/` のみ。iOS Extension のメモリ上限と起動時間の要件があるため、ESLint で機械的に制限している（`docs/DesignDoc.md` §3.1）。

## テスト

| 対象 | 方法 |
|---|---|
| pure function（URL 正規化・パーサ・署名検証・日付計算ほか） | Vitest |
| Repository・スキーマ | better-sqlite3 を in-memory で開き、実マイグレーションを適用して Vitest |
| Share Extension・課金・通知 | 実機で手動（[docs/testing/manual-checklist.md](docs/testing/manual-checklist.md)） |
| E2E | Maestro（Home のスワイプと読了フローのみ。[.maestro/](.maestro/)） |

CI は PR と `main` への push で lint / typecheck / format / test / bundle を回す
（[.github/workflows/](.github/workflows/)）。

## 開発ルール

- コードを書く前に `.claude/skills/code-rules/SKILL.md` を読む
- PR はマージ前に `.claude/skills/self-review/SKILL.md` の手順でセルフレビューする
