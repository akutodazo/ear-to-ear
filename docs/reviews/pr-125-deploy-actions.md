# レビュー: PR #125 デプロイを GitHub Actions に（マージで dev、demo は手で押す。PC の bot をやめる）

## 対象
- PR: https://github.com/akutodazo/ear-to-ear/pull/125 （`ci/deploy-on-merge` → `main`）。レビューの時点で未マージ
- 読んだコミット: `38cfd62`（bot をやめ、禁止を 11-03 に戻す）・`52733b3`（`deploy.yml`）・`137bb70`（決定と手順書）
- 変わったファイル: `.github/workflows/deploy.yml`（新規）、`docs/dev/deploy-actions.md`（新規）、`.claude/settings.json`、`docs/dev/claude-user-settings.sample.json`、`docs/dev/permissions.md`、`docs/dev/cloudflare-bot.md`（削除）、`docs/dev/cloudflare.md`、`CLAUDE.md`、`docs/decisions.md`、`docs/spec.md` §10

## レビューした者
書いた会話を見ていない別の Claude Code のセッション（Claude Opus 5.5、`claude-opus-5-5`）。受け取ったのは PR の番号と読み方（AGENTS.md と docs/spec.md を読んでから見る）だけ。

## 読んだもの
- `AGENTS.md`（§1-3 秘密、§3 レビュー、§5 無人運転）、`CLAUDE.md`、`docs/spec.md`（§10 公開リポジトリの安全、§11 環境）
- 差分の全部
- 差分の外で関わるもの: `.github/workflows/check.yml`、`wrangler.jsonc`、`package.json`（`check` と `wrangler` の版）、`scripts/ops/l6-live.mjs`（login・logout）、`docs/dev/cloudflare.md`、`docs/reviews/pr-122-cloudflare-bot.md`（前のレビュー）
- 差分の全体で、トークンの値・手元のパス・ユーザー名を探した。見つからなかった

## 手元で確かめたこと
PR の先頭（`137bb70`）で `npm ci` → `npm run check`。結果は下の「検証ログ」。

- AT-1〜4 は確かめていない（Environment と秘密が無く、Cloudflare に触らないため）
- `deploy.yml` は読んで確かめた: 動くのは `push`（main）と `workflow_dispatch` だけで、`pull_request`・`pull_request_target` では動かない（AT-3 は字のとおり）。ジョブの `if: github.ref == 'refs/heads/main'` と、手順書の Environment の「main だけ」で、ほかのブランチから demo を押しても秘密に届かない

## 結論
**止める指摘が 1 つある**（#1）。PR を入れただけでは秘密が無いので何も起きないが、「止める」は「**Environment に秘密を置く前に #1 を直す**」と読む（#122 のレビューと同じ読み方）。#2〜#3 は直す、#4 以降は見送ってよい。

| # | 重さ | 一言 |
|---|---|---|
| 1 | **止める** | main に入ったどのコードからも、アカウント全体に効くトークンに手が届く。Claude は人が差分を読まずにマージできるので、「Claude はクラウドに触らない」「demo は人の承認」が字のとおりにならない |
| 2 | 直す | 禁止を 11-03 に戻したことで、#122 で足した `wrangler delete`・`d1 delete`・`r2 bucket`・`login`・`l6-live.mjs` の禁止も消えた |
| 3 | 直す | 文書の「Claude はクラウドに触らない」は、Claude の PR のマージで dev にデプロイと migration が流れることを書いていない |
| 4 | 見送ってよい | Environment を作る前にマージすると、GitHub が守りの無い `dev`・`demo` を自動で作る |
| 5 | 見送ってよい | 細かい点（版の固定、migration の確認、順番） |

## 指摘

### 1.【止める】main に入ったどのコードからも、アカウント全体に効くトークンに手が届く
- 何が: `deploy.yml` は 1 つのジョブの中で `npm ci` → `npm run check`（リポジトリのテスト・lint・`next build` を実行する）→ wrangler の 2 段、の順に動く。秘密は wrangler の段の `env` にしか書いていないが、**同じジョブの前の段で動いたコードは、後の段で使うファイルを書き換えられる**（例: テストの中から `node_modules/.bin/wrangler` や `node_modules/wrangler` を書き換えれば、次の段でトークンを受け取ったときに送り出せる）。`wrangler.jsonc` には `build.command`（デプロイの前に任意のコマンドを流す欄）も書ける。つまりトークンに届く経路は「`deploy.yml` を書き換える PR」だけでなく、**main にマージされた PR のどれでも**になる
- トークンの効く範囲: 手順書の権限は Account の Workers Scripts / Edit と D1 / Edit。Cloudflare のトークンは Worker・D1 ごとに絞れないので、dev だけでなく **demo の Worker・D1、そして同じアカウントの既存の資源**（spec §11「既存のものと別名（`harvest-share-*`）」から、同じアカウントに別のプロジェクトの資源があると読める）にも効く。Worker の秘密の登録・削除、Worker の削除、任意の SQL も API としては出来る
- なぜ問題か:
  - `CLAUDE.md`（11-03 本人決定）で、Claude が作った PR は CI が通れば**人に聞かずにマージしてよい**。main の Ruleset のマージに要る承認は 0（AGENTS.md §3）。だから、人が差分を読まないコードが、トークンのあるジョブで動く
  - この PR の決定と文書は「Claude はクラウドに触らない」「demo は人が押して Environment の承認を通す」「秘密は wrangler の段にだけ渡す（依存の install・build には渡さない）」と書く。dev の Environment にあるトークンで demo にも既存の資源にも届くので、**demo の承認は、push の経路からは外せる**。`deploy.yml` のコメント「依存の install・build には渡さない」も、上の理由で守りにはなっていない
  - #122 のレビューの「止める」（無人運転にトークンが届く）は、PC にトークンを置かないことで消えた。その代わりに、**Claude のマージ → Actions** という別の道でトークンに届くようになった。悪意は要らない（プロンプトインジェクション・依存の乗っ取り・事故で書いたテスト）
- 直し方（案）。A と B の両方を推奨（A だけだと B の経路が残る、B だけだと A の経路が残る）:
  - **A（推奨、文書だけ・すぐ出来る）**: `CLAUDE.md` の自動マージの例外に「**`.github/workflows/**`・`wrangler.jsonc`・`package.json`・`package-lock.json` を変える PR は、人が差分を読んでからマージする**」を足す。Ruleset で守れるなら、これらのパスに CODEOWNERS とレビュー必須を付ける（承認 0 の決定を変えるので本人の承認が要る。期間中は文書の決まりだけでもよい）
  - **B（推奨、`deploy.yml` の直し）**: リポジトリのコードを動かすジョブと、秘密を持つジョブを分ける
    1. `build` ジョブ（Environment なし、秘密なし）: `npm ci` → `npm run check` → `out/` を `actions/upload-artifact` で渡す
    2. `deploy` ジョブ（`needs: build`、Environment あり）: checkout → `npm ci --ignore-scripts`（依存の install のスクリプトを止める）→ `out/` を受け取る → wrangler の 2 段。ここではテスト・build・`next.config` を動かさない。wrangler が `worker/index.ts` をまとめるのは esbuild の bundle だけで、実行はしない
    - 確かめていないこと: `--ignore-scripts` で wrangler（workerd・esbuild）が動くか。動かなければ `npm ci` のままでもよい（依存は lockfile の中身なので、A で `package-lock.json` を人が見れば守れる）
  - **C（文書）**: `docs/decisions.md` の 11-04 の弱点に「トークンはアカウント全体（demo・既存の資源）に効く。main に入ったコードはトークンに届きうる（B で狭める）」を足す。`deploy-actions.md` にも同じ 1 行
  - 別の案（今は要らない）: ear-to-ear 用の別の Cloudflare アカウントに資源を移せば、効く範囲がこのプロジェクトだけになる。期間中は手間が大きいので、提出の後に考える程度でよい

### 2.【直す】#122 で足した禁止まで消えた
- 何が: `38cfd62` は `.claude/settings.json` と個人の設定のひな形を `1f4b247` に戻したので、#122 で足した禁止のうち、**bot と関係なく役に立つもの**も消えた。11-03 の形は `npx wrangler deploy*`・`secret*`・`d1 * --remote*`・`r2 * --remote*` だけで、次は当たらない
  - `npx wrangler delete`（Worker の削除）、`npx wrangler d1 delete …`・`d1 create …`（`--remote` を付けなくても常にクラウド）、`npx wrangler r2 bucket …`（同じ）、`npx wrangler login`、`npx wrangler versions secret …`
  - `node scripts/ops/l6-live.mjs`（中で login・`secret put`・deploy をする）
- なぜ問題か: 秘密の登録は今も本人の手元から `npx wrangler login` で行う（`deploy-actions.md`・`cloudflare.md`）。`cloudflare.md` は「終わったら `logout`」と書くが、忘れると PC にクラウドの資格が残り、そのあいだは上の形が止まらない。#122 で足した分は bot が無くても害が無い
- 直し方（案）: 11-03 の 4 つの形を戻したうえで、#122 で足した形（`d1 create・delete・time-travel`、`r2 bucket`、`wrangler delete`、`wrangler login`、`versions secret`、`l6-live.mjs`）を残す（和集合にする）。`permissions.md` の D の行も合わせる

### 3.【直す】「Claude はクラウドに触らない」が字のとおりではない
- 何が: `deploy-actions.md` の「Claude はクラウドに触らない」、`CLAUDE.md` の「それ以外のクラウドに触ること…は本人が行う」。一方で `CLAUDE.md` の自動マージの決まりにより、Claude が自分の PR をマージすると、Actions が dev に**デプロイと `d1 migrations apply --remote`** を流す。Claude が書いた `migrations/` の SQL（`DROP TABLE` を含みうる）が、人が読まずに dev の D1 に入る
- なぜ問題か: 決定は弱点に「main に入ったものは人が見ずに dev に出る。migration も自動で流れる」と書いているので、仕組みは承知のうえと読める。ただ `CLAUDE.md` と手順書だけを読む人（と Claude）は「Claude は dev に触れない」と受け取る
- 直し方（案）: `CLAUDE.md` と `deploy-actions.md` に「Claude が手元からクラウドに触ることはしない。ただし Claude がマージした PR は、Actions で dev にデプロイと migration が流れる」と書く。migration の PR を自動マージの例外にするか（dev のデータは架空なので、しなくてもよい）は本人が決める

### 4.【見送ってよい】Environment を作る前にマージすると、守りの無い Environment が自動で出来る
- 何が: GitHub は、workflow が名前を指した Environment が無いと、その名前で**守りの無い**（ブランチの制限も承認も無い）Environment を自動で作る。この PR を先にマージすると、直後の push で `dev` が出来る。誰かが先に demo を押すと `demo` も出来る。秘密が無いので失敗するだけで害は無いが、手順書の「New environment → `dev`」は、もう有ると押せない
- 直し方（案）: `deploy-actions.md` の「人がすること」の頭に「**この PR をマージする前に** 2 を済ませる。もう `dev`・`demo` が有れば、New ではなくその名前を開いて同じ設定をする」と 1 行足す

### 5.【見送ってよい】細かい点
- `actions/checkout@v7`・`actions/setup-node@v7` は版の名前（タグ）で指していて、コミットの SHA ではない。秘密のあるジョブなので SHA で固定するのが定石だが、どちらも GitHub 自身のもので、`check.yml` と揃えている。#1 の B で秘密のジョブを分けるときに考えればよい
- `d1 migrations apply --remote` が CI で確認を聞かずに進むかは、手順書の「確かめていないこと」のとおり。最初の dev の実行で、ログに「Migrations to be applied」の後に止まらず進んだかを見る
- migration の後にデプロイが失敗すると、新しい表と古いコードの組になる。今の migration は足すだけなので問題にならない。消す・名前を変える migration を書くときだけ気を付ける
- `concurrency` は環境ごとに 1 本で、`cancel-in-progress: false`。migration の途中で止めないので、このままでよい

## 良かった点
- `pull_request` で動かさず、ジョブの `if` と Environment の「main だけ」の二重で、PR とほかのブランチから秘密に届かない
- `permissions: contents: read` と `persist-credentials: false` で、ジョブの中に GitHub への書き込みの資格を残さない
- 秘密を Environment ごとに置き、demo に人の承認を付ける形にした。トークンの期限（11-30）と、止め方・漏れたときの手順がある
- #122 のレビューの「止める」（無人運転にトークンが届く）を、PC にトークンを置かないことで根から消した。決定に「同じ日の bot を置き換える」と、11-02 の決定を変えることを書いている
- 弱点に「main に入ったものは人が見ずに dev に出る」「migration も自動」を自分で書いている（#1・#3 はそれを広げたもの）

## 検証ログ
PR の先頭 `137bb70` で `npm ci` → `npm run check`。**終了コード 0**（行は抜き出し）。テストの数と安全検査のファイル数は PR 本文と一致する。

```
check:safety: 313 ファイルを確認
check:safety: OK（名前・デモの JPEG・圃場の座標・秘密らしい文字列）
✖ 2 problems (0 errors, 2 warnings)
 Test Files  84 passed (84)
      Tests  2032 passed (2032)
✓ Compiled successfully in 2.4s
```
