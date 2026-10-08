# 📈 Trade Journal

> **利益ではなく、良い意思決定を積み重ねる。**

---

## プロジェクトについて

### 現在の保存方式・公開環境

- ログインは不要です。取引記録・Watchlist・Paper Tradeは、この端末のブラウザのlocalStorageに保存します。
- Supabaseの再開、テーブル作成、`NEXT_PUBLIC_SUPABASE_URL`・`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`の設定は不要です。
- `/backup`で記録をJSONファイルへ書き出し、復元できます。端末間の自動同期はありません。
- iPhoneのホーム画面への追加手順は`/install`にあります。
- 株価・決算取得には`FINNHUB_API_KEY`、株価履歴取得には`ALPHA_VANTAGE_API_KEY`を使用します。これらは記録の端末保存とは独立しています。
- `supabase/migrations`は旧クラウド保存構成の履歴です。現在のアプリでは使用せず、公開時にも実行しません。

Vercelで`Resource provisioning failed`が表示された場合は、デプロイ詳細の状態とログを確認してください。このエラーだけを根拠にSupabaseへテーブルを追加する必要はありません。

Trade Journalは、売買記録を残すだけのアプリではありません。

市場環境・市場テーマ・重要イベント・心理状態・ルール遵守・振り返りを記録し、

**投資家として成長すること**

を目的としたジャーナルです。

---

## 開発理念

- 相場を分析する前に、自分を分析する。
- 勝ちよりも、良い意思決定を評価する。
- 勝ちパターンには寿命がある。
- 市場環境が変われば、自分もアップデートする。
- 資産配分も投資である。

---

## Motto

> 「完成しないと、それが使えない。」

この言葉を忘れず、一歩ずつ積み上げていく。

---

## 開発者

- Product Owner：Takuma
- Technical Lead：ChatGPT

---

## Roadmap

- ✅ Version 0.3　記録機能完成
- 🚧 Version 0.4　市場環境・市場テーマ・イベント
- 🔜 Version 0.5　編集機能・タグ
- 🔜 Version 0.6　分析ダッシュボード
- 🔜 Version 1.0　Trade Journal Release
- 🔜 Version 2.0　AI分析
- 🔜 Version 3.0　AIコーチ

Trade Journal

Track your positions. Improve your decisions.

「ポジションを管理し、良い意思決定を積み重ねるための投資ジャーナル」
