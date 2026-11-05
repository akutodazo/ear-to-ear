# 引き継ぎメモを本物の Claude で 1 回通す（本人向け、L6）

T31（#113）の `POST /api/fields/:id/handover` を、dev で本物の Claude につなぐ。#113 のレビューの指摘 1（デモの前に 1 回呼んで確かめる）。

## やること（コマンドは 1 つ）
リポジトリのフォルダで、main を最新にしてから:

```bash
node scripts/ops/l6-live.mjs
```

途中で聞かれるのは次の 3 つだけ（どれも画面には残らない）。

| 聞かれること | いつ |
|---|---|
| ブラウザで Cloudflare にログイン | ログインしていないときだけ |
| Claude API のキーを貼る | dev に `CLAUDE_API_KEY` がまだ無いときだけ（1 回目だけ） |
| 管理者の合言葉 | 毎回 |

終わったら、画面の「=== 5.」から下を先輩に見せる（合言葉とキーは出ていない）。

## スクリプトがすること
1. Cloudflare にログイン（済みなら飛ばす）
2. dev の D1 に表を作る（`0002_handover` まで。済みなら何もしない）
3. 秘密 `CLAUDE_API_KEY` が無ければ登録する
4. `npm run build` と `wrangler deploy --env dev`
5. 判断のある圃場を 1 つ選び、管理者として引き継ぎメモを作る。結果（状態コード・かかった秒数・根拠つきの文の数・メモ）を表示し、GET で読み直す
6. ログアウト

5 は Claude の 1 日の回数（50 回）を 1 つ使う。dev に判断が 1 件も無いときは、画面で判断を 1 つ残してから実行し直す。

## 結果の読み方
| 表示 | 意味 | すること |
|---|---|---|
| `200`、根拠つき 1 以上 | 通った | 何もしない（先輩に見せるだけ） |
| `502`、`reason: "shape"` | Claude の返事の形が想定と違う | 画面の出力を先輩に見せる。続くなら止める（下） |
| `502`、`reason: "http"` | キーが違う・Claude に届かない | キーを確かめる（`npx wrangler secret put CLAUDE_API_KEY --env dev` で入れ直せる） |
| `503` | Claude が止まっている | キーが登録されたか確かめる |

## 止めたいとき
Cloudflare の dev の Worker の設定で、変数 `CLAUDE_ENABLED` を `false` にする（大文字小文字は問わない）。POST は 503 を返し、Claude を呼ばない。

## demo でも通すとき
```bash
node scripts/ops/l6-live.mjs --env demo
```

## 確かめ直すだけのとき（デプロイ済み）
```bash
node scripts/ops/l6-live.mjs --url https://<dev の URL>
```
5 だけを行う（ログイン・デプロイ・ログアウトはしない）。
