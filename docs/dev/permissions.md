# Claude Code の許可の確認を減らす（個人の設定）

**状態**: 本人は 11-03 に入れた。**先輩も自分の PC で入れてほしい**（下の「入れ方」）。リポジトリの設定（`.claude/settings.json`）は変えない。

## なぜ
Claude Code が「許可しますか？（常に許可・一度だけ）」と聞く回数を減らす。ただし、外に出る・取り消しにくい操作は聞き続け、クラウドと秘密は止める。

## なぜ個人の設定（`~/.claude/settings.json`）に置くか
- **どのフォルダで起動したセッションにも効く**。リポジトリの `.claude/settings.json` は、そのリポジトリのフォルダで起動したときしか読まれない（本人は別のフォルダから起動していて、`wrangler deploy` などの禁止が効いていなかった。11-03 に分かった）
- リポジトリの `.claude/settings.json` は2人で共有し、無人運転では凍結するので、好みの許可を足さない
- 手元の `.claude/settings.local.json`（無人運転の禁止）はそのまま。**禁止は許可より強い**ので、無人運転の守りは弱くならない

## 4つの段
| 段 | 例 | 扱い |
|---|---|---|
| A 読むだけ・手元で確かめるだけ | `npm run check`・`lint`・`typecheck`・`test`・`build`、`npx tsc --noEmit`、`node scripts/check-safety.mjs`、読むだけの MCP | 常に許可（決まった形だけ） |
| B 外に出るが、今の決まりで Claude に任せているもの | `git add/commit/push`、`gh pr create`・`gh pr merge * --squash --auto`・`gh pr edit`・`gh issue create` | 常に許可 |
| C 取り消しにくいもの | `gh pr close`・`gh issue close`、`--auto` の無い `gh pr merge`、`rm`、`taskkill`、`git worktree remove`、`curl` | 毎回聞く（設定に書かない） |
| D 人の手で行うもの | main への push・強制 push、`wrangler secret put・delete`・`d1 execute --remote`・R2 への書き込み・`wrangler delete`・`wrangler login`、`.dev.vars`・`.env*`・`private/` を読む（デプロイと `d1 migrations apply --remote` は 11-04 から Claude に任せた。`cloudflare-bot.md`） | 禁止 |

- `grep`・`cat`・`git status/log/diff`・`gh pr view` などは Claude Code が最初から許しているので書かない
- `npx vitest run *`・`python *`・`node -e *`・`npx -y …` のように**何でも実行できる形は許可しない**（テストは `npm run test` の決まった形で許可）
- 一覧は、本人の会話の記録 30 件で実際に多かったものから作った（11-03）

## 入れ方
1. [`claude-user-settings.sample.json`](claude-user-settings.sample.json) を開き、`permissions` の `allow` と `deny` を、自分の `~/.claude/settings.json`（Windows は `C:\Users\<ユーザー名>\.claude\settings.json`）の `permissions` に足す。**ほかの項目（`model` など）は消さない**。すでに `permissions` があれば、重ならないように足す
2. `Read(...)` の4行の `<ユーザー名>`・`<作業フォルダの親>`・`<ear-to-ear の置き場所>` を自分のものに書き換える。例: リポジトリが `C:\Users\satoru\projects\ear-to-ear` なら `Read(//c/Users/satoru/projects/**/.env*)`、`Read(//c/Users/satoru/projects/ear-to-ear/private/**)`
3. 保存すると、動いているセッションにもそのまま効く（公式: 設定ファイルの変更は再起動なしで読み直される）

### パスの書き方（Windows）
**Windows では `//c/Users/...` の形で書く**。公式のドキュメント（https://code.claude.com/docs/en/permissions の「How path patterns match」）に、Windows のパスは `/c/Users/...` の形にそろえてから比べる、とある。

本人の PC では次の書き方は効かなかった（11-03）:
- `Read(**/private/**)`: 起動したフォルダからの位置として読まれる
- `Read(~/projects/…)`: 理由は分からない

macOS・Linux なら `//Users/<ユーザー名>/…` や `~/…` の形になる（試していない）。

## 効いているかの確かめ方（何も送らない）
| 確かめること | やり方 | 期待 |
|---|---|---|
| 秘密の登録の禁止 | Claude に `npx wrangler secret put X --env dev` を頼む | 実行の前に「denied」で止まる（止まらなくても、値を聞かれたところで Ctrl+C） |
| 読み取りの禁止 | Claude に `private/` の下の**秘密でない**ファイル（例 `private/fixtures/README.md`、`node scripts/make-fixtures.mjs` で作れる）を読ませる | 「denied by your permission settings」で止まる。`.dev.vars` で試さない |

## 気を付けること
- 禁止は書いた形にしか効かない。`cd … && …` のようにつないだコマンドや、前に変数を付けた形（`ALLOW_PUSH=1 git push`）が、許可・禁止に当たるかは確かめていない
- Read の禁止は Claude の道具（Read・`cat` など）に効くが、スクリプトの中で開くファイルには効かない（公式の注意）
- 先輩の MCP の檻（`docs/dev/cage.md`）は `--setting-sources project` で起動するので、個人の設定は読まれない（檻の守りはそのまま）
- 内蔵ブラウザのサイトの許可と computer use のアプリの許可は、この設定とは別。聞かれたときに画面で「常に許可」を選ぶ
