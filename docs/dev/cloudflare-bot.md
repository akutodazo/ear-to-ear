# Cloudflare の bot（Claude にデプロイと migration を任せるトークン）

11-04 本人決定（`docs/decisions.md`）。Claude は、この PC の環境変数 `CLOUDFLARE_API_TOKEN` にあるトークンで、dev・demo のデプロイ・`d1 migrations apply --remote`・読むだけの操作を行う。`wrangler login` は要らない（環境変数のトークンが先に使われる）。

## 人がすること（PC ごとに 1 回、5 分）
アカウントの持ち主が作る。**トークンの値を会話・Issue・PR・ファイルに貼らない**。

1. Cloudflare のダッシュボード → 右上の人の印 → **My Profile → API Tokens → Create Token → Create Custom Token**
2. 次のとおりに入れて **Continue to summary → Create Token**

   | 欄 | 値 |
   |---|---|
   | Token name | `ear-to-ear-claude-<PC の名前>` |
   | Permissions | Account / **Workers Scripts** / Edit<br>Account / **D1** / Edit<br>Account / **Workers R2 Storage** / Read<br>Account / **Account Settings** / Read<br>User / **User Details** / Read<br>User / **Memberships** / Read（`wrangler.jsonc` にアカウントの ID が無いので、トークンから自分のアカウントを探すのに要る） |
   | Account Resources | Include / ear-to-ear の資源があるアカウントだけ |
   | TTL | 終わりを **2026-11-09** |

3. 出てきたトークンをコピーし、PowerShell に次の 1 行を貼って Enter。「トークン」と聞かれたら貼って Enter（画面には出ない）

   ```powershell
   $t = Read-Host "トークン" -AsSecureString; [Environment]::SetEnvironmentVariable("CLOUDFLARE_API_TOKEN", [Net.NetworkCredential]::new("", $t).Password, "User")
   ```

4. Claude のアプリを一度閉じて開き直す（新しい環境変数は、開き直したアプリからしか見えない）
5. 個人の設定（`~/.claude/settings.json`）に古い禁止（`npx wrangler deploy*`・`secret*`・`d1 * --remote*`・`r2 * --remote*`）があれば、[`claude-user-settings.sample.json`](claude-user-settings.sample.json) の `deny` に置き換える（`docs/dev/permissions.md`）。**個人の設定に古い禁止が残っていると、リポジトリの設定を緩めても止まったまま**

**トークンでできることは、下の表の「しない」より広い**（Workers Scripts と D1 の Edit は、秘密の登録・任意の SQL・削除も API として許す。同じアカウントの別のプロジェクトの Worker・D1 にも効く）。下の禁止は、よくある書き方の事故を止めるだけで、守りの全部ではない。

Claude に「bot を確かめて」と言えば、`npx wrangler whoami` で、トークンで入れているかを確かめる。

## Claude がしてよいこと・しないこと
| してよい（dev・demo） | しない（本人。`.claude/settings.json` で止める） |
|---|---|
| `npm run build` → `npx wrangler deploy --env dev｜demo` | `wrangler secret put・delete・bulk`、`versions secret` |
| `npx wrangler d1 migrations apply DB --remote --env …` | `d1 execute --remote`、`d1 create・delete・time-travel` |
| `wrangler whoami`・`deployments list`・`secret list`・`d1 migrations list --remote`・`r2 object get --remote` | `r2 object put・delete`、`r2 bucket …`、`wrangler delete`、`wrangler login` |

- **demo のデプロイと、dev・demo の migration は、main の最新（`git status` がきれい）からだけ**。dev のデプロイは作業中のブランチからでもよい。migration は main にある SQL だけを流す
- demo のデプロイの前は `npm run check` を通す
- トークンの値を表示しない。`echo $env:CLOUDFLARE_API_TOKEN` も、**環境変数の一覧**（`env`・`printenv`・`set`・`Get-ChildItem Env:`）も出さない（よくある形は設定で止めた）。有無を見るときは `Test-Path Env:CLOUDFLARE_API_TOKEN` のように有るか無いかだけ。ファイルに書かない

## 無人運転のとき（必ず）
- **リレー・檻**: 子に決まった環境変数しか渡さないので、トークンは届かない（`scripts/relay/run-day.mjs`・`scripts/cage/server.mjs` の `CHILD_ENV`）。人がすることは無い
- **`/goal`**: ふつうのセッションのまま動くので、トークンが届く。**始める前に人がトークンを外し、アプリを開き直す**。終わったら 3 の 1 行で入れ直す

   ```powershell
   [Environment]::SetEnvironmentVariable("CLOUDFLARE_API_TOKEN", $null, "User")
   ```

## やめるとき・漏れたとき
- ダッシュボードの API Tokens で、そのトークンを **Delete**（11-09 には期限で使えなくなる）
- PowerShell で消す: `[Environment]::SetEnvironmentVariable("CLOUDFLARE_API_TOKEN", $null, "User")`

## 確かめていないこと
- 上の権限でデプロイ・migration が通るか（足りなければ、wrangler のエラーに出た権限を足す）。workers.dev の URL の切り替えに別の権限が要るかもしれない
- 禁止は `npx wrangler <何か> <操作>` の形（引数の順を問わない）に効くように書いた。`npx --yes`・`npx wrangler@…`・`npm exec`・`node_modules` から直接呼ぶ wrangler は全部止めた。`node` のスクリプトの中から呼ぶ wrangler は止まらない（`l6-live.mjs` は秘密を登録するので止めた。`--url` の形も止まるので、そのときは人が流す）
- 途中に `*` がある禁止の書き方が、Claude Code で意図どおりに当たるかは、実機で確かめていない（`permissions.md` の確かめ方）
