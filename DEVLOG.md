# 📘 Trade Journal Development Log
# 開発の始め方

Trade Journal 起動方法

① cd C:\Users\fcd05\projects\trade-journal

② npm run dev

③ http://localhost:3000
---
## GitHubへ保存

git add .

git commit -m "コミットメッセージ"

git push origin main


## 2026-07-11

### Version 0.4 Day 1

#### ✅ 完了
- componentsフォルダを作成
- Dashboard.tsxを作成
- JournalForm.tsxを作成
- JournalList.tsxを作成
- READMEを作成
- GitHubへPush

#### 💡 決定事項
- 市場環境を追加する
- 市場テーマを追加する
- 重要イベントを追加する

#### 📝 メモ
Trade Journalは利益を記録するアプリではなく、
良い意思決定を積み重ねるアプリとして開発する。
---

## 2026-07-14

### Version 0.4 Day 2

#### ✅ 完了

- 市場環境を追加
- Journal型を更新
- 保存処理を更新
- 記録一覧へ表示
- GitHubへPush

#### 💡 メモ

市場環境を記録できるようになった。
Trade Journalが「売買記録」から「市場を考慮した記録」へ進化した。
## 2026-07-14

### Version 0.4 Day3

#### ✅ 完了

- 市場テーマのデータ構造を追加
- 保存処理を更新
- リセット処理を更新

#### 次回

市場テーマ入力欄を追加する。

## Version 0.4 Day4

### ✅ 完了

- 市場テーマ追加
- 保存処理対応
- 一覧表示対応

### 次回

重要イベントを追加する。

## Version 0.5 Day 1

### 完了
- 編集ボタンを追加
- 保存済み記録をフォームへ戻せるようにした
- 更新機能を追加
- 編集キャンセル機能を追加
- 古い保存データの読み込みにも対応

### 次回
実際に使いながら、入力項目と運用頻度を見直す。

## Version 0.5 Day2

### 完了
- react-calendarを導入
- 月間カレンダーを追加
- 記録日にマーカー表示
- 日付クリックで絞り込み
- 「すべて表示」を追加
- 検索との併用対応
- 古いtradeDateデータへ移行対応
- npm run build成功

### 学び
- 初めてCodex CLIを使って機能追加を実施
- AIとの役割分担（設計：ChatGPT、実装：Codex）の流れを確立

### 次回
- UIの見た目改善
- カレンダーのデザイン調整

## 学び

初めてCodex CLIを利用してAIと共同開発を実施。
機能設計はChatGPT、実装はCodex、レビューと改善は自分という役割分担を確立した。

## Version 0.5 Day2

### 完了
- react-calendarを導入
- 月間カレンダーを追加
- 記録日にマーカー表示
- 日付クリックで絞り込み
- ダッシュボードを追加
- 勝率・ルール遵守率・飛びつき回数を表示
- Codex CLIを導入し、初めてAIと共同開発を実施
- npm run build成功

### 学び
- CodexとVS Codeで同じファイルを開いていると保存競合が起こることがある
- 競合時は慌てず比較・確認して対処する
- ChatGPTで設計、Codexで実装という流れが確立できた

### 次回
- ダッシュボードの見た目改善
- グラフや統計の追加を検討

cd C:\Users\fcd05\projects\trade-journal

npm run dev