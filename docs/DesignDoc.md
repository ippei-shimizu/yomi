# Design Doc: Yomi

| 項目 | 内容 |
|---|---|
| 作成日 | 2026-08-22 |
| ステータス | Draft v0.1 |
| 関連 | PRD.md |

---

## 1. 概要

iOS 向け「後で読む」アプリ。端末内 SQLite に全データを保持し、サーバを持たない。
Share Extension と本体アプリが App Group 経由で同一 DB を共有する。

### 設計原則

1. **サーバレス**：同期・共有要件がないため、バックエンドを持たない。運用コスト 0
2. **Share Extension は書くだけ**：ネットワーク・メタ取得を一切行わず即閉じる
3. **状態は 3 つ**：`unread / read / archived`。これ以外の状態を増やさない
4. **Pro 判定を 1 箇所に集約**：`useEntitlement()` 以外で RevenueCat を参照しない

## 2. 技術スタック

| レイヤ | 採用 | 理由 |
|---|---|---|
| フレームワーク | Expo SDK（最新安定版）+ React Native, TypeScript | BUZZ BASE mobile / まわコレと共通。prebuild 前提 |
| ルーティング | expo-router | ファイルベース。ディープリンク（通知タップ）が扱いやすい |
| DB | expo-sqlite + Drizzle ORM | 型安全なクエリ。マイグレーション管理が容易 |
| Share Extension | expo-share-extension | config plugin で iOS Share Extension を生成。React Native で UI を書ける |
| 状態管理 | Zustand + React Query（DB 読み取りのキャッシュ用） | 軽量。DB が単一ソースなので複雑な状態管理は不要 |
| 課金 | react-native-purchases（RevenueCat） | まわコレと共通。Sandbox / 復元 / entitlement 管理を委譲 |
| 通知 | expo-notifications | ローカル通知のみ |
| ブラウザ | expo-web-browser（SFSafariViewController） | Reader 対応・Cookie 共有 |
| バックグラウンド | expo-background-task | メタデータ取得のリトライ |
| 分析 | PostHog（posthog-react-native） | 本体のみ。Extension では初期化しない |
| クラッシュ | Sentry | BUZZ BASE mobile と同じ構成 |
| UI | NativeWind + 自作コンポーネント | Tailwind 流儀で速く書ける |
| CI/CD | EAS Build + EAS Submit | GitHub Actions から呼び出す |

## 3. アーキテクチャ

```
┌──────────────────────────────┐   ┌──────────────────────────┐
│  Share Extension             │   │  Main App                │
│  (expo-share-extension)      │   │  (expo-router)           │
│                              │   │                          │
│  1. URL 受信                 │   │  Home / Library / Stats  │
│  2. 正規化・重複チェック      │   │  Settings / Paywall      │
│  3. INSERT items(status=     │   │                          │
│     'unread', meta_status=   │   │  ┌────────────────────┐  │
│     'pending')               │   │  │ MetaFetchWorker    │  │
│  4. close()                  │   │  │ (起動時 + BG Task) │  │
└──────────┬───────────────────┘   │  └────────┬───────────┘  │
           │                       │           │              │
           │   App Group Container │           │              │
           └───────────┐  ┌────────┘           │              │
                       ▼  ▼                    ▼              │
               ┌─────────────────┐    ┌────────────────────┐  │
               │  SQLite (yomi.db)│    │ oEmbed / OGP fetch │  │
               │  items, tags,    │    │ (端末から直接)       │  │
               │  item_tags,      │    └────────────────────┘  │
               │  read_logs       │                            │
               └─────────────────┘                            │
                                   │  RevenueCat SDK          │
                                   │  PostHog / Sentry        │
                                   └──────────────────────────┘
```

### 3.1 モジュール構成

```
src/
├── app/                    # expo-router（画面）
│   ├── (tabs)/
│   │   ├── index.tsx       # Home: 未読キュー
│   │   ├── library.tsx     # 既読・アーカイブ
│   │   └── stats.tsx       # 週次サマリ
│   ├── item/[id].tsx       # 詳細・編集
│   ├── paywall.tsx
│   ├── settings/
│   └── onboarding/
├── db/
│   ├── schema.ts           # Drizzle schema
│   ├── client.ts           # openDatabase(App Group path)
│   ├── migrations/
│   └── repositories/       # itemRepo, tagRepo, statsRepo
├── domain/
│   ├── url/normalize.ts    # URL 正規化・ソース判定
│   ├── meta/               # oEmbed / OGP fetcher, worker
│   ├── entitlement/        # Pro 判定（RevenueCat + override）
│   ├── notification/       # 今日の1本スケジューラ
│   └── export/             # JSON / CSV
├── features/               # 画面単位の hooks / components
├── ui/                     # 共通コンポーネント
└── lib/                    # analytics, sentry, config
share-extension/
└── index.tsx               # Extension エントリ（最小依存）
```

**依存ルール**：`share-extension/` は `db/`、`domain/url/`、`design/`（デザイントークン）のみ import 可。`features/`, `ui/`, RevenueCat, PostHog, Sentry を import しない（バンドルサイズ・起動時間のため）。ESLint の `no-restricted-imports` と `app.config.ts` の `excludedPackages` の両方で強制する。

デザイントークンを `ui/` ではなく `design/` に置いているのは、`ui/` がコンポーネントを含むため。ESLint のパターンは gitignore と同じ規則で、除外したツリーの中の 1 ファイルだけを再包含できない。

## 4. データモデル

### 4.1 スキーマ（Drizzle）

```ts
// db/schema.ts
export const items = sqliteTable('items', {
  id: text('id').primaryKey(),                   // uuid v7（時系列ソート可）
  url: text('url').notNull(),                    // 正規化後 URL
  originalUrl: text('original_url').notNull(),
  urlHash: text('url_hash').notNull().unique(),  // sha256(url) 重複検知用
  source: text('source').notNull(),              // 'x'|'instagram'|'threads'|'zenn'|'qiita'|'note'|'medium'|'youtube'|'web'
  title: text('title'),
  description: text('description'),
  thumbnailUrl: text('thumbnail_url'),
  siteName: text('site_name'),
  author: text('author'),
  status: text('status').notNull().default('unread'),      // 'unread'|'read'|'archived'
  metaStatus: text('meta_status').notNull().default('pending'), // 'pending'|'done'|'failed'
  metaRetryCount: integer('meta_retry_count').notNull().default(0),
  memo: text('memo'),
  snoozedUntil: integer('snoozed_until', { mode: 'timestamp' }),
  savedAt: integer('saved_at', { mode: 'timestamp' }).notNull(),
  readAt: integer('read_at', { mode: 'timestamp' }),
  archivedAt: integer('archived_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (t) => ({
  statusSavedIdx: index('idx_items_status_saved').on(t.status, t.savedAt),
  metaStatusIdx: index('idx_items_meta_status').on(t.metaStatus),
}));

export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const itemTags = sqliteTable('item_tags', {
  itemId: text('item_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
  tagId: text('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (t) => ({ pk: primaryKey({ columns: [t.itemId, t.tagId] }) }));

// 週次集計用。items の更新で失われる履歴（読了→未読に戻す等）を残す
export const readLogs = sqliteTable('read_logs', {
  id: text('id').primaryKey(),
  itemId: text('item_id').notNull(),
  event: text('event').notNull(),   // 'saved'|'read'|'archived'|'unread'
  at: integer('at', { mode: 'timestamp' }).notNull(),
}, (t) => ({ atIdx: index('idx_read_logs_at').on(t.at) }));

// 将来の iCloud 同期に備え、Extension からの書き込みはここを経由しない（直接 items）
```

### 4.2 状態遷移

```
        save
  ───────────────▶ unread ──read──▶ read
                    │  ▲              │
                    │  │ unread       │ archive
             archive│  └──────────────┤
                    ▼                 ▼
                 archived ◀───────────┘
                    │ restore
                    └──────▶ unread
```

- `snooze`：status は `unread` のまま `snoozedUntil` をセット。ホームの並びで `snoozedUntil > now` は末尾へ
- 物理削除は `archived` からのみ。`archived` は保存上限カウントに含めない

### 4.3 FTS（検索）

Pro のメモ全文検索用に `items_fts`（FTS5, `title, memo, description`）を trigger で同期。無料プランは `title LIKE` のみ。

**トークナイザは `trigram` を使う。** 既定の `unicode61` は連続する日本語を 1 トークンとして扱うため、「Solid Queueのasyncモード」に対して「モード」も「async」も引けない（実測で確認済み）。ただし `trigram` は 3 文字未満のクエリを扱えないので、**2 文字以下は `LIKE` にフォールバックする**（「入門」「DB」のような語は日常的に検索されるため）。

## 5. 主要コンポーネント設計

### 5.1 Share Extension

```ts
// share-extension/index.tsx
export default function ShareExtension({ url, text }: InitialProps) {
  const [state, setState] = useState<'saving'|'saved'|'duplicate'|'limit'|'error'>('saving');

  useEffect(() => {
    (async () => {
      const raw = url ?? extractFirstUrl(text);
      if (!raw) return setState('error');
      const normalized = normalizeUrl(raw);
      const hash = await sha256(normalized);
      const db = openSharedDb();                       // App Group path

      if (await itemRepo.existsByHash(db, hash)) return setState('duplicate');
      if (!(await canSave(db))) return setState('limit');  // 無料上限判定（5.3 参照）

      await itemRepo.insert(db, {
        id: uuidv7(), url: normalized, originalUrl: raw, urlHash: hash,
        source: detectSource(normalized), status: 'unread', metaStatus: 'pending',
        savedAt: new Date(), updatedAt: new Date(),
      });
      setState('saved');
      setTimeout(close, 600);                          // トースト表示後に閉じる
    })();
  }, []);
  // UI: 状態ごとのカード。'saved' 時のみタグ選択チップ（任意）を表示
}
```

- **ネットワーク禁止**。iOS Extension はメモリ上限（~120MB）とライフタイムが短い
- 上限判定のため Extension からも Pro 状態を知る必要がある → 本体が **App Group コンテナ上の `shared-state.json`** に `isPro` をキャッシュし、Extension はそれを読む（RevenueCat SDK は Extension に入れない）。`UserDefaults(suiteName:)` はカスタムネイティブモジュールが必要になるため、`expo-file-system` の `Paths.appleSharedContainers` で完結する方式を採った。読めない場合は必ず無料プラン扱いに倒す
- `limit` 時は「本体アプリで Pro にアップグレード」のメッセージのみ。購入は Extension 内で行わない

### 5.2 MetaFetchWorker

```
トリガー: 本体 foreground 時 / expo-background-task（15分以上間隔、OS 裁量）
対象:    meta_status='pending' AND meta_retry_count < 3 を saved_at ASC で最大 10 件
並列:    3
タイムアウト: 8s / 件
```

ソース別戦略：

| source | 方法 | 備考 |
|---|---|---|
| x | `https://publish.twitter.com/oembed?url=…&omit_script=1` | 認証不要。`html` から本文テキスト抽出、`author_name` を author に |
| youtube | `https://www.youtube.com/oembed?url=…` | title, thumbnail_url |
| instagram / threads | fetch しない。URL から username を抽出し `@username` を title に | ログイン必須でメタ取得不可 |
| zenn / qiita / note / medium / web | HTML を fetch し OGP（`og:title`, `og:image`, `og:site_name`, `og:description`）を parse。無ければ `<title>` | UA は Safari 相当に設定。HTML は先頭 256KB で打ち切り |

失敗時：`meta_retry_count++`、3 回で `failed`。`failed` でも title が空なら hostname を表示。ユーザーは詳細画面で手動編集可。

### 5.3 Entitlement（Pro 判定）

```ts
// domain/entitlement/useEntitlement.ts
export function useEntitlement() {
  const rc = useRevenueCatCustomerInfo();          // react-native-purchases
  const override = useDevOverride();                 // Keychain に保存された署名済みトークン
  const isPro = override.valid || rc.entitlements.active['pro'] != null;

  useEffect(() => {
    // Extension 用にキャッシュ
    SharedDefaults.set('isPro', isPro);
  }, [isPro]);

  return { isPro, source: override.valid ? 'override' : rc ? 'revenuecat' : 'none' };
}
```

**DevOverride の仕組み**（サーバなしで自分だけ Pro にする）

1. 開発機で Ed25519 鍵ペアを生成。**秘密鍵は 1Password 等に保管しリポジトリに入れない**
2. アンロックコード = `base64(payload) + "." + base64(signature)`。payload = `{ "sub": "ippei", "exp": 4102444800 }`
3. アプリには**公開鍵のみ**を埋め込み。設定画面のバージョン表記 7 タップ → コード入力 → `tweetnacl` で検証 → 有効なら Keychain（expo-secure-store）に保存
4. 公開鍵が埋め込まれていても、署名を作れるのは秘密鍵を持つ自分だけ。リバースエンジニアで解除されるリスクは「バイナリパッチで `isPro=true` にされる」と同等で、RevenueCat のみの構成と変わらない

RevenueCat 側の設定：

- Entitlement: `pro`
- Offering `default`：`monthly`（¥400）/ `annual`（¥2,800, 7 日トライアル）/ `lifetime`（¥5,800, non-consumable）
- `Purchases.configure({ apiKey, appUserID: undefined })` → 匿名 ID。アカウント機能がないため `restorePurchases()` を Settings に必ず置く

### 5.4 通知スケジューラ

```
起動時・アイテム状態変更時・設定変更時に再計算:
  1. 既存の scheduled notification を全キャンセル
  2. unread かつ snoozedUntil <= now から 1 件取得（Today's Pick と同じ日付シードのランダム選択。5.6 参照）
  3. 0 件なら終了
  4. 設定時刻（Pro は複数）ごとに翌 7 日分をスケジュール。payload に itemId
  5. 通知タップ → expo-router で /item/[id]?open=1 → 即ブラウザ起動
```

サーバレスなので「通知時点の最新未読」ではなく「スケジュール時点の最古未読」になる。許容する（毎回起動時に再計算されるため実用上ずれは小さい）。

### 5.5 URL 正規化

```ts
// 不正な URL と http(s) 以外のスキームは null を返す
export function normalizeUrl(raw: string): string | null { … }
```

実装上の要点（`src/domain/url/normalize.ts`）：

- **http(s) 以外のスキームを拒否する。** `new URL('javascript:alert(1)')` も `new URL('file:///etc/passwd')` も例外を投げずにパースが成功するため、検査しないと SFSafariViewController に渡ってしまう
- **例外を投げず `null` を返す。** 共有シートやインポートの貼り付けという信頼できない入力を直接受けるため
- `www.` / `mobile.` を除去し、`twitter.com` を `x.com` に統一
- トラッキングパラメータの除去は**スコープを分ける**
  - 全ホスト: `utm_*` / `fbclid` / `gclid` / `ref`
  - `x.com` のみ: `s` / `t`
  - `instagram` / `threads` のみ: `igsh`

  `s` / `t` を全ホストで落とすと `/search?s=rails` と `/search?s=react` が同じ `url_hash` になり、**2 件目以降が「保存済み」と誤判定されて保存できなくなる**。重複が 1 件増えるより明確に悪いため、迷ったら落とさない方に倒す
- `m.` 始まりのホストは正規化しない（同じ理由で、別サービスを同一視するリスクを取らない）

短縮 URL（`t.co`）は Extension 内では展開しない。MetaFetchWorker が HEAD で展開し `url` を更新、`url_hash` も再計算（衝突時は古い方に統合）。

### 5.6 Today's Pick 選択

```ts
// 同じ日は同じアイテムを返す。⟳ で nonce をインクリメントして引き直す
export function pickToday(candidates: Item[], dateKey: string, nonce = 0): Item | null {
  if (candidates.length === 0) return null;
  const seed = fnv1a(`${dateKey}:${nonce}`);
  return candidates[seed % candidates.length];
}
```

候補は `status='unread' AND (snoozedUntil IS NULL OR snoozedUntil <= now)`。nonce は MMKV に `pick:${dateKey}` で保存し日付が変わればリセット。通知（5.4）も同じ関数で nonce=0 を使うため、通知とホームの Today's Pick は一致する。

### 5.7 URL 一括インポート（Pro）

```
入力テキスト → /https?:\/\/[^\s<>"']+/g で抽出 → normalizeUrl → sha256 → 既存 hash と突合
→ プレビュー（新規 n 件 / 重複 m 件）→ 1 トランザクションで INSERT（meta_status='pending'）
→ MetaFetchWorker を即時起動
```

Worker の 1 回あたり上限（10 件）はインポート直後のみ 50 件に引き上げる。Pro 判定は `useEntitlement()` を経由。

## 6. 画面とデータフロー（概略）

| 画面 | 読み取り | 書き込み |
|---|---|---|
| Home | `items WHERE status='unread' ORDER BY (snoozedUntil>now), savedAt ASC` | status 更新、snooze |
| Item detail | `items` + `item_tags` | title/memo/tags 編集 |
| Library | `status IN ('read','archived')` + フィルタ | restore, delete |
| Stats | `read_logs` を週単位で集計 | なし |
| Paywall | RevenueCat offerings | purchase / restore |
| Settings | 通知設定（MMKV） | 通知再スケジュール、export, import |

React Query のキーは `['items', status, filter]`。`itemRepo` の書き込み後に `invalidateQueries(['items'])` と `['stats']` を呼ぶ。

## 7. インフラ・運用

### 7.1 iOS 設定

- App Group: `group.jp.ippei.yomi`（本体 / Extension 共通）
- Bundle ID: `jp.ippei.yomi` / Extension: `jp.ippei.yomi.ShareExtension`（`expo-share-extension` がターゲット名から自動導出する。変更するオプションが無い）
- `app.config.ts` で `expo-share-extension` plugin を設定。`activationRules` はプラグインの高レベル形式で `[{ type: 'url', max: 1 }, { type: 'text' }]` と書く（プラグインが `NSExtensionActivationSupportsWebURLWithMaxCount` / `…Text` に変換する）
- `NSExtensionActivationSupportsWebPageWithMaxCount` は `preprocessingFile`（Safari の DOM から情報を抜く JS）を渡したときのみ出力される。現状は設定していない
- **`expo-share-extension` は公式には SDK 54 までの対応**（README の対応表、`expo-modules-core@^3.0.20`）。本プロジェクトは SDK 57 で、config plugin と生成物は検証済みだが Xcode でのコンパイルは未検証。落ちた場合は SDK 54 へのダウングレードで対応する
- Background Modes: `fetch`, `processing`
- 通知: `UNUserNotificationCenter` 権限はオンボーディング最終画面で要求

### 7.2 ビルド・配布

| 環境 | EAS profile | 用途 |
|---|---|---|
| development | `development` | dev client。Share Extension 動作確認 |
| preview | `preview` | TestFlight 内部テスト。RevenueCat Sandbox |
| production | `production` | App Store |

GitHub Actions：`main` push で `eas build --profile preview --non-interactive`。タグ `v*` で production + `eas submit`。

### 7.3 分析イベント（PostHog）

`item_saved`（source）, `item_read`（days_since_saved）, `item_archived`, `notification_opened`, `paywall_viewed`（trigger: `limit_save` / `limit_tag` / `stale_bulk` / `memo_search` / `import` / `settings`）, `purchase_completed`（product）。
個人特定情報・URL・タイトルは送らない。送れるプロパティは `AnalyticsEvent`（`src/lib/analytics.ts`）の型で縛り、型テストで固定する。

**`item_saved` は本体が送る。** 保存は Share Extension で起きるが、そこには PostHog を入れられない。本体は起動時と foreground 復帰時に `read_logs` を見て、前回送った時刻より後の `saved` を送る（送信済み位置を MMKV に保持し、二重送信も送り漏れも防ぐ）。

Sentry は `beforeSend` / `beforeBreadcrumb` で URL・タイトル・メモをスクラブする。`xhr` / `fetch` の breadcrumb は URL そのものを持つため捨てる。

### 7.4 バックアップ

端末内のみのため、データ消失リスクを Export（JSON）で緩和。将来 iCloud 対応する場合は `read_logs` を含めた DB ファイルごと `NSFileManager.ubiquityContainer` に置く方式か、CloudKit への行同期かを改めて設計する。今回は `id` に uuid v7、全テーブルに `updated_at` を持たせ、後者への移行余地を残す。

## 8. テスト方針

| 対象 | 方法 |
|---|---|
| URL 正規化・ソース判定・oEmbed/OGP parser | Vitest（pure function） |
| Repository | **better-sqlite3** を in-memory で開き、`drizzle/` の実マイグレーションを適用して Vitest（expo-sqlite はネイティブモジュールで Node では動かない。ドライバのみが本番と異なり、SQL とスキーマは同一） |
| Entitlement override 署名検証 | Vitest（鍵ペアはテスト用に別途生成） |
| Share Extension | 実機 dev build で手動。自動化はしない |
| 課金 | RevenueCat Sandbox + StoreKit Configuration file（Xcode）|
| E2E | Maestro（Home のスワイプ / 読了フロー のみ） |

## 9. 代替案と不採用理由

| 案 | 不採用理由 |
|---|---|
| Supabase + サーバ側メタ取得 | 同期要件がなく、運用コストと個人情報（閲覧 URL）をサーバに置くデメリットが上回る |
| Swift ネイティブで Share Extension を書く | expo-share-extension で十分。Swift と RN の二重メンテを避ける |
| Realm / WatermelonDB | Share Extension との共有で実績が少ない。SQLite ファイル共有が最も素直 |
| Firebase Remote Config で Pro override | Firebase 依存を増やしたくない。署名付きコードで同等の結果を得られる |
| Extension 内でメタ取得 | メモリ・時間制限で不安定。ユーザー体感でも「即閉じる」方が良い |

## 10. 未決事項

- [ ] X oEmbed の rate limit 実測（1 日 100 件程度なら問題ないはず）
- [x] `expo-share-extension` の最新 SDK 対応状況の確認 → 公式には SDK 54 まで。SDK 57 で config plugin と生成物は動作を確認済み。Xcode でのコンパイルは実機で要確認（§7.1）
- [ ] 買い切り後にサブスク契約が残っているケースの UI（RevenueCat 側で lifetime を優先表示）
- [x] Stats の「週」の起点 → 月曜固定
- [x] Today's Pick の選択方式 → ランダム（5.6）
- [x] 読了確認シートの ON/OFF → Settings で切替可（MMKV `readConfirm`）
