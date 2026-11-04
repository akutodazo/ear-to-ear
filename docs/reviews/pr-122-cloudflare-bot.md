# レビュー: PR #122 Cloudflare の bot（Claude にデプロイと migration を任せ、秘密と書き込みは本人のまま）

## 対象
- PR: https://github.com/akutodazo/ear-to-ear/pull/122 （`chore/cloudflare-bot` → `main`）。**レビューの前にマージ済み**（main の `09d71a0`、squash）
- レビューの対象は main の `09d71a0`。読んだのは PR の先頭 `6766bf5`（コミット `3d7d4d9`・`c452e02`・`6766bf5`）で、`git diff 6766bf5 09d71a0` は空（中身は同じ）
- 変わったファイル: `.claude/settings.json`、`docs/dev/claude-user-settings.sample.json`、`CLAUDE.md`、`docs/decisions.md`、`docs/dev/cloudflare-bot.md`（新規）、`docs/dev/cloudflare.md`、`docs/dev/permissions.md`

## レビューした者
書いた会話を見ていない別の Claude Code のセッション（Claude Opus 5.5、`claude-opus-5-5`）。受け取ったのは PR の番号と読み方（AGENTS.md と docs/spec.md を読んでから見る）だけ。

## 読んだもの
- `AGENTS.md`（§1-3 秘密、§3 レビュー、§5 無人運転）、`CLAUDE.md`、`docs/spec.md`（§10 公開リポジトリの安全、§11 環境）
- 差分の全部
- 差分の外で関わるもの: `scripts/relay/run-day.mjs` と `scripts/cage/server.mjs` の `CHILD_ENV`、`scripts/ops/l6-live.mjs`（wrangler の呼び方・ログインとログアウト）、`docs/dev/l6-live.md`、`docs/dev/harness-v0.6-relay.md`、`wrangler.jsonc` の `name` と `env`
- 差分の全体で、トークンの値・手元のパス・ユーザー名を探した。見つからなかった

## 手元で確かめたこと
PR の先頭（`6766bf5`）で `npm ci` → `npm run check`。**終了コード 0**。

```
check:safety: 311 ファイルを確認
check:safety: OK（名前・デモの JPEG・圃場の座標・秘密らしい文字列）
✖ 2 problems (0 errors, 2 warnings)
 Test Files  84 passed (84)
      Tests  2032 passed (2032)
✓ Compiled successfully in 2.5s
```
テストの数 2032 件は PR 本文と一致する。

- **AT-3 は読んで確かめた**: `run-day.mjs` の `CHILD_ENV` は `PATH`・`Path`・`SystemRoot`・`TEMP`・`TMP`・`HOME`・`USERPROFILE`・`APPDATA`・`LOCALAPPDATA`・`USERNAME` の 10 個だけ、檻（`cage/server.mjs`）は最初の 7 個だけ。`CLOUDFLARE_*` は入らない。リレーと檻の子にはトークンが届かない
- AT-1・AT-2（禁止が実際に効くか）は確かめていない。トークンが無く、Cloudflare に触らないため。`npx wrangler d1 execute*--remote*` のように**途中に `*` がある書き方**が Claude Code で意図どおり当たるかも、実機では確かめていない

## 結論
**止める指摘が 1 つある**（#1）。PR はもうマージされているので、「止める」は「**トークンを置く前に #1 を直す**」と読み替える（マージの後に人がトークンを作る手順なので、置く前ならまだ間に合う）。直し方は文書と手順だけで済む。「直す」は次の PR でよい。

| # | 重さ | 一言 |
|---|---|---|
| 1 | **止める** | `/goal` の無人運転にトークンが届く。「無人運転に渡さない」はリレーと檻にしか当てはまらない |
| 2 | 直す | トークン自体は秘密の登録・`d1 execute`・Worker の削除・同じアカウントの別の Worker まで出来る。禁止の一覧が唯一の守りになり、引数の順を変えるだけで外れる |
| 3 | 直す | `d1 migrations apply --remote` と demo のデプロイを、マージ前のブランチからも出来る |
| 4 | 直す | spec §10 の「デプロイは本人の手元から」と食い違う |
| 5 | 直す | 環境変数を一覧で出すコマンドで、トークンが会話に出る |
| 6 | 見送ってよい | 細かい点（`l6-live.mjs --url` も止まる、確かめ方の表） |

## 指摘

### 1.【止める】`/goal` の無人運転にトークンが届く
- 何が: トークンは**ユーザーの環境変数**（`SetEnvironmentVariable(..., "User")`）に置くので、開き直した Claude のアプリから始まる全部のセッションに見える。AGENTS.md §5 は無人運転の道具を2つ挙げていて、檻（`claude -p`、子の env は `CHILD_ENV`）と **`/goal`（普通のセッションのまま、手元の deny・push 先の無効化・pre-push フック）** がある。`/goal` は `CHILD_ENV` を通らないので、トークンがそのまま使える
- なぜ問題か: AGENTS.md §5 は「どちらでも秘密を外す」と決めている。この PR で deny から `npx wrangler deploy*` と `d1 migrations apply --remote` が外れたので、`/goal` の無人のセッションが dev・demo にデプロイ・migration しても、止めるのは §5 の文の「`wrangler` をしない」だけになる。`docs/decisions.md` の 11-04 と `cloudflare-bot.md` の「無人運転（リレー・檻）は…トークンは届かない」は、`/goal` を書いていないので、読んだ人は「無人運転は全部安全」と受け取る
- 直し方（案）:
  - A（推奨）: `cloudflare-bot.md` と decisions の 11-04 に「**`/goal` の前にトークンを外す**: `[Environment]::SetEnvironmentVariable("CLOUDFLARE_API_TOKEN", $null, "User")` → アプリを開き直す → 終わったら戻す」を書き、`/goal` の手順（ハーネスの設計・`docs/dev/` の該当箇所）の「始める前」にも同じ1行を足す。「無人運転に渡さない」の文は「リレー・檻は仕組みで渡さない。`/goal` は人が外す」に直す
  - B: `/goal` のパケットのときは、`wrangler` の deny を全部戻した個人の設定に切り替える（手間が増えるので A より弱い）

### 2.【直す】トークンの権限は禁止の一覧より広い。禁止の一覧は事故を減らすだけで、外れ方が多い
- 何が: `cloudflare-bot.md` の権限は Account の **Workers Scripts / Edit** と **D1 / Edit**。この2つは、Worker の秘密の登録・削除（`secret put`）、Worker の削除、`d1 execute`（任意の SQL）、D1 の作成・削除を、どれも API として許す。Account Resources は「アカウントだけ」なので、**同じアカウントにある別のプロジェクトの Worker・D1 にも効く**（spec §11 の「既存のものと別名（`harvest-share-*`）」から、同じアカウントに既存の資源があると読める）。PR の弱点 1 は dev と demo の両方に効くことしか書いていない
- 前との違い: `l6-live.mjs` は最初と最後に `wrangler logout` をしていて、`docs/dev/l6-live.md` も「ログイン・デプロイ・ログアウト」の流れなので、今までは PC にクラウドの資格が残らないのが普通だったと読める。つまり今までの deny は**二重目の守り**だった。この PR の後は deny が**唯一の守り**になる
- deny の外れ方（どれも `npx wrangler …` の形の deny に当たらない。確かめたのは書き方だけで、実行はしていない）:
  - 引数の順: `npx wrangler --env dev secret put X`、`npx wrangler -e demo d1 execute DB --remote --command …`
  - 呼び方: `npx --yes wrangler secret put X`、`npx wrangler@4 secret put X`、`npm exec wrangler -- secret put X`、`node_modules/.bin/wrangler secret put X`
  - スクリプト: `node ./scripts/ops/l6-live.mjs`、`node scripts\ops\l6-live.mjs`（deny は `node scripts/ops/l6-live.mjs*` の綴りだけ）
- 直し方（案）:
  - 文書: decisions・`cloudflare-bot.md`・`CLAUDE.md` の「`.claude/settings.json` で止めている」を、「**トークン自体は出来る。deny はよくある書き方の事故を止めるだけ**」に直す。弱点に「同じアカウントの別のプロジェクトにも効く」を足す
  - deny: 引数の順に強い形にする（例 `Bash(npx wrangler *secret put*)`・`Bash(npx wrangler *d1 execute*--remote*)`・`Bash(npx wrangler *delete*)` のように `wrangler` の直後にも `*` を置く。`npx --yes wrangler*`・`npx wrangler@*`・`npm exec wrangler*` も足す）。全部は塞げないので、上の文書の直しが先
  - 別の案（今は要らない）: ear-to-ear 用の別の Cloudflare アカウントに資源を移す。期間中は手間が大きいので、提出の後に Terraform の話と一緒に考える程度でよい

### 3.【直す】migration と demo のデプロイを、マージ前のブランチからも出来る
- 何が: `d1 migrations apply --remote` は `migrations/` の SQL を流すので、Claude が作業中のブランチで migration を書いて apply すれば、`d1 execute --remote` を止めた意味が薄れる（`DROP TABLE` なども書ける）。デプロイも、レビュー前の作業中のコードを demo に出せる
- 直し方（案）: `cloudflare-bot.md` の「してよい」に条件を足す。「**demo へのデプロイと migration は main の最新（`git status` がきれい）からだけ**。dev は作業中のブランチからでもよいが、migration は main にあるものだけ」。`CLAUDE.md` の「demo のデプロイの前は `npm run check` を通す」の隣に置く

### 4.【直す】spec §10 と食い違う
- 何が: spec §10 は「Actions に Cloudflare の秘密を置かない（**デプロイは本人の手元から**。期間中は自動デプロイにしない）」。この PR の後は Claude がデプロイするので、「本人の手元から」は字のとおりには合わない。PR 本文のセルフチェックは「spec §10 は変えない」としているが、Actions の部分は変えなくてよく、括弧の中だけ直せばよい
- 直し方（案）: 「デプロイは手元の PC から（本人か、bot のトークンを使う Claude。`docs/dev/cloudflare-bot.md`）。期間中は自動デプロイにしない」

### 5.【直す】環境変数を一覧で出すコマンドで、トークンが会話に出る
- 何が: `cloudflare-bot.md` は「`echo $env:CLOUDFLARE_API_TOKEN` などをしない」と書くが、事故で起きやすいのは名前を指さない一覧（`env`、`printenv`、`set`、`Get-ChildItem Env:`、`gci env:`、`dir env:`）。環境の調べものでよく打たれ、出た値は会話に残る（Remote Control を ON にしているので会話は Anthropic のサーバーにも残る、decisions 11-03）。トークンは `npm run test`・`build`・`wrangler dev`、同じ PC の別のリポジトリのセッション、Codex にも見える（PR の弱点 3）
- 直し方（案）: 「しない」に「環境変数の一覧（`env`・`printenv`・`set`・`Get-ChildItem Env:`）を出さない。要るときは `Test-Path Env:CLOUDFLARE_API_TOKEN` のように**有るか無いかだけ**を見る」を足す。個人の設定のひな形の deny に `Bash(env)`・`Bash(printenv*)`・`PowerShell(Get-ChildItem Env:*)`・`PowerShell(gci env:*)`・`PowerShell(dir env:*)` を足してもよい

### 6.【見送ってよい】細かい点
- `node scripts/ops/l6-live.mjs*` の deny は、確かめ直すだけの `--url` の形（ログイン・デプロイ・秘密をしない）も止める。困ったら `--url` の形だけ人が流せばよいので、そのままでよい
- `permissions.md` の「効いているかの確かめ方」は `secret put` の1行だけ。#2 で deny の形を変えるなら、引数の順を変えた形（`npx wrangler --env dev secret put X`）も1行足すと、deny の弱さが目で分かる
- `cloudflare.md` の「クラウド」の節の最初の文「`npx wrangler login` の後に」は、bot のときはログイン不要（`cloudflare-bot.md` の冒頭）なので、「本人は `wrangler login` の後に、Claude は bot のトークンで」と書き分けると迷わない
- `r2 object get --remote` で R2 の写真を読めるのは、写真が架空でメタデータの無いものだけ（AGENTS.md §1-2・§1-5）なので問題ない。D1 の中身は `d1 execute --remote` を止めているので読めない（`d1 export --remote` は止めていないが、中身は架空のデータだけ）

## 良かった点
- トークンの値をどこにも書かず、PowerShell の入れ方も `Read-Host -AsSecureString` で画面と履歴に残らない
- 期限（11-09）と、やめ方・漏れたときの手順がある
- 「選ばなかった案」に GitHub Actions を挙げ、11-02 の決定（Actions に秘密を置かない）と照らしている
- リレーと檻の `CHILD_ENV` がトークンを通さないことは、コードのとおり
- 弱点の候補に、deny が `npx wrangler …` の形にしか効かないことを自分で書いている（#2 はそれを広げたもの）
