# 問い合わせフォーム自動送信システム (Outreach Hub)

企業の問い合わせフォームをキーワード検索で自動収集し、テンプレートに沿った問い合わせを効率的に送信するウェブ管理ツールです。

## 機能概要

- **キーワード検索**: SerpAPI または モックデータで問い合わせ先を自動収集
- **フォーム自動検出**: Playwright によるコンタクトページ・フォームフィールド解析
- **事前確認画面**: 送信前に必ず内容を確認（バイパス不可）
- **CAPTCHA 対応**: 検出時は手動チェックリストに自動振り分け（自動突破なし）
- **除外ルール**: 業種・会社名・ドメインで送信対象を除外
- **重複送信防止**: 同一ドメインへの二重送信を自動ブロック
- **Google Sheets 連携**: 送信履歴をスプレッドシートに自動出力
- **マルチユーザー**: 管理者・メンバーのロール管理
- **dry-run モード**: 実際の送信なしで動作確認

---

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| フレームワーク | Next.js 15 (App Router) + TypeScript |
| スタイル | Tailwind CSS |
| データベース | SQLite + Prisma 7 |
| 認証 | JWT (jose) + bcryptjs |
| ブラウザ自動化 | Playwright |
| 検索API | SerpAPI / モック |
| 外部連携 | Google Sheets API (サービスアカウント) |

---

## セットアップ

### 1. 前提条件

- Node.js 20 以上
- npm 10 以上

### 2. 依存パッケージのインストール

```bash
npm install
```

### 3. 環境変数の設定

```bash
cp .env.example .env
```

`.env` を開いて必要な値を設定してください（[環境変数の説明](#環境変数の説明) 参照）。

### 4. データベースの初期化

```bash
# マイグレーション実行（初回）
npx prisma migrate dev --name init

# Prisma クライアント生成（migrate dev 後に自動実行されますが、明示的に実行する場合）
npm run db:generate
```

### 5. 初期データの投入

```bash
npm run db:seed
```

実行後、以下のアカウントが作成されます：

| ロール | メールアドレス | パスワード |
|-------|--------------|----------|
| 管理者 | admin@outreach-hub.jp | Admin2026! |
| メンバー | member@outreach-hub.jp | Member2026! |

> **重要**: 本番環境ではシード後に必ずパスワードを変更してください。

### 6. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開き、管理者アカウントでログインしてください。

---

## 環境変数の説明

| 変数名 | 必須 | 説明 |
|-------|-----|------|
| `DATABASE_URL` | ✅ | SQLite ファイルのパス（例: `file:./prisma/dev.db`） |
| `SESSION_SECRET` | ✅ | セッション暗号化キー（32文字以上のランダム文字列） |
| `SEARCH_PROVIDER` | ✅ | `mock`（開発用）または `serpapi`（本番用） |
| `SERPAPI_API_KEY` | △ | SerpAPI キー（`SEARCH_PROVIDER=serpapi` 時は必須） |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | △ | Google サービスアカウントのメールアドレス |
| `GOOGLE_PRIVATE_KEY` | △ | Google サービスアカウントの秘密鍵 |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | △ | 連携するスプレッドシートの ID |
| `DEFAULT_SEND_DELAY_SECONDS` | ✅ | 問い合わせ間の待機秒数（デフォルト: `5`） |
| `MAX_SENDS_PER_DAY` | ✅ | 1日の最大送信件数（デフォルト: `50`） |
| `ALLOW_LIVE_SEND` | ✅ | `false` = dry-run、`true` = 本番送信（デフォルト: `false`） |

---

## Google Sheets 連携の設定

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクトを作成
2. **Google Sheets API** を有効化
3. **サービスアカウント**を作成し、JSON キーをダウンロード
4. ダウンロードした JSON から以下を `.env` に設定：
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL` = `client_email` の値
   - `GOOGLE_PRIVATE_KEY` = `private_key` の値（`\n` はそのまま）
5. 送信先スプレッドシートをサービスアカウントのメールアドレスに**編集者として共有**
6. スプレッドシートの URL から ID を取得して `GOOGLE_SHEETS_SPREADSHEET_ID` に設定
7. スプレッドシートに **`送信履歴`** という名前のシートを作成し、1行目に以下のヘッダーを記入：

```
送信日時 | 担当者 | キーワード | 検索URL | 問い合わせURL | ステータス | エラー | テンプレート | CAPTCHA | 会社名 | 送信種別
```

---

## dry-run モードと本番送信の切り替え

### dry-run モード（初期設定・推奨）

`.env` で `ALLOW_LIVE_SEND="false"` を設定すると、フォーム送信の動作は行わず、ログのみ記録します。動作確認・テストに使用してください。

### 本番送信モード

十分な動作確認後、`ALLOW_LIVE_SEND="true"` に変更してください。

> **注意**: 本番送信は実際に相手先のフォームを送信します。送信前確認画面での承認が必須です。

---

## Playwright の設定

フォームの自動検出・送信に Playwright を使用しています。

### ブラウザのインストール

```bash
npx playwright install chromium
```

### 動作確認

コンタクトページ検出は管理画面の「検索結果」から各サイトの「フォーム検出」ボタンで実行できます。

---

## 操作手順

### 基本フロー

```
キーワード登録 → 検索実行 → フォーム自動検出 → 事前確認 → 送信（or 手動チェック）
```

### 詳細手順

1. **キーワード登録** (`/keywords`)
   - 検索キーワードを登録（例: `東京 Web制作会社`）

2. **検索実行**
   - キーワード一覧から「検索実行」ボタンをクリック
   - SerpAPI またはモックデータで検索結果を取得・保存

3. **フォーム検出** (`/search-results`)
   - 検索結果一覧から対象サイトを選択
   - 「フォーム検出」でコンタクトページと入力フィールドを自動解析

4. **事前確認** (`/review/[id]`)
   - 送信内容（会社名・テンプレート・フィールドマッピング）を確認
   - CAPTCHA 検出サイトは自動的に「手動チェック」扱い

5. **送信承認**
   - 「送信する」をクリック → dry-run または本番送信を実行
   - 結果は DB + Google Sheets に記録

### 除外ルール設定 (`/exclude-rules`)

- **業種除外**: 特定の業種を含む企業を除外
- **会社名除外**: 特定の会社名を除外
- **ドメイン除外**: 特定のドメインを除外
- **営業禁止文言**: フォーム内の「営業目的はお断り」等のパターンを除外

---

## データベース管理

```bash
# Prisma Studio（GUI でDB閲覧・編集）
npm run db:studio

# 新しいマイグレーション作成
npx prisma migrate dev --name <変更内容の説明>

# 本番マイグレーション適用
npx prisma migrate deploy
```

---

## デプロイ

### Vercel（推奨）

1. GitHub リポジトリにプッシュ
2. Vercel でプロジェクトをインポート
3. 環境変数を Vercel ダッシュボードで設定
4. デプロイ後、`npx prisma migrate deploy` を実行

> **注意**: Vercel の Serverless Functions では Playwright は動作しません。フォーム検出・送信機能を使う場合は VPS (Ubuntu 等) での運用を推奨します。

### VPS（Ubuntu）

```bash
# 依存インストール
npm ci --production

# ブラウザインストール
npx playwright install chromium --with-deps

# マイグレーション
npx prisma migrate deploy

# 起動
npm run build && npm start
```

---

## 注意事項

- **利用規約の遵守**: 送信先サービスの利用規約を必ず確認してください
- **送信頻度**: `MAX_SENDS_PER_DAY` と `DEFAULT_SEND_DELAY_SECONDS` で適切な間隔を設定してください
- **CAPTCHA 自動突破禁止**: CAPTCHA が検出された場合は必ず手動で対応してください（システムは自動突破しません）
- **個人情報**: 収集した企業情報は個人情報保護法・特定電子メール法を遵守して取り扱ってください
- **本番移行前**: 必ず dry-run モードで十分テストしてから `ALLOW_LIVE_SEND="true"` に切り替えてください

---

## ライセンス

本システムはクライアント向け納品物です。無断転用・再配布を禁止します。
