# マージでデプロイする（GitHub Actions）

11-04 本人決定（`docs/decisions.md`）。`.github/workflows/deploy.yml`。

| いつ | どこへ | すること |
|---|---|---|
| PR が main にマージされたとき（自動） | dev | `npm run check` と build（秘密なし）→ 別のジョブで `d1 migrations apply --remote` → `wrangler deploy` |
| Actions の画面で人が「Run workflow」を押したとき | demo（選べば dev も） | 同じ。demo は Environment の承認を通ってから動く |

- PR（`pull_request`）では動かない。フォークの PR に秘密は渡らない
- リポジトリのコード（テスト・lint・build）を動かすジョブと、秘密を持つジョブを分けた。秘密のジョブは `npm ci --ignore-scripts` で依存の install スクリプトも動かさず、build の結果（`out/`）を受け取ってデプロイするだけ
- 秘密の登録（合言葉・`SESSION_SECRET`・`CLAUDE_API_KEY`）は今までどおり本人の手元から（`docs/dev/cloudflare.md`）。デプロイしても Worker の秘密は消えない
- Claude は手元からクラウドに触らない（`.claude/settings.json` で止めている）。ただし **Claude がマージした PR も、dev にデプロイと migration が流れる**。Claude ができるのは、その結果を `gh run list --workflow deploy` で読むこと
- **トークンは Worker・D1 ごとに絞れず、アカウント全体（demo と、同じアカウントのほかの資源）に効く**。秘密のジョブで動く wrangler の設定・依存・workflow を変える PR（`.github/workflows/**`・`wrangler.jsonc`・`package.json`・`package-lock.json`）は、自動マージせず人が差分を読む（CLAUDE.md）

## 人がすること（1 回、10 分）
**トークンの値を会話・Issue・PR・ファイルに貼らない**。**deploy の PR（#125）をマージする前に 2 まで済ませる**（先にマージすると、GitHub が守りの無い `dev` を自動で作る。もう `dev`・`demo` が有れば、New ではなくその名前を開いて同じ設定をする）。

### 1. Cloudflare のトークンを作る
1. https://dash.cloudflare.com/profile/api-tokens → **Create Token** → **Create Custom Token** の **Get started**
2. 次のとおりに入れて **Continue to summary → Create Token** → **Copy**

   | 欄 | 値 |
   |---|---|
   | Token name | `ear-to-ear-github-actions` |
   | Permissions | Account / **Workers Scripts** / Edit<br>Account / **D1** / Edit<br>Account / **Account Settings** / Read |
   | Account Resources | Include / ear-to-ear の資源があるアカウントだけ |
   | TTL | 終わりを **2026-11-30**（提出の後の手直しの分） |

3. アカウントの ID を控える: ダッシュボードの **Workers & Pages** の右側の **Account ID**（秘密ではないが、トークンと同じ所に置く）

### 2. GitHub に置く
https://github.com/akutodazo/ear-to-ear/settings/environments で:

1. **New environment** → 名前 `dev` → **Configure environment**
   - **Deployment branches and tags** → **Selected branches and tags** → **Add deployment branch or tag rule** → `main`
   - **Environment secrets** → **Add environment secret** を 2 回: `CLOUDFLARE_API_TOKEN`（1 のトークン）、`CLOUDFLARE_ACCOUNT_ID`（1-3 の ID）
2. **New environment** → 名前 `demo` → 上と同じ 2 つと、加えて
   - **Required reviewers** にチェック → 本人（と先輩）を足す → **Save protection rules**

### 3. 確かめる
次の PR のマージの後、https://github.com/akutodazo/ear-to-ear/actions/workflows/deploy.yml に緑の印が付けばよい。Claude に「デプロイを確かめて」と言えば、結果を読む。

## demo に出すとき
1. https://github.com/akutodazo/ear-to-ear/actions/workflows/deploy.yml → **Run workflow** → `demo` → **Run workflow**
2. 承認を求められたら **Review deployments** → `demo` にチェック → **Approve and deploy**

## 止めるとき・漏れたとき
- 自動を止める: Actions の画面の deploy → 右上の **…** → **Disable workflow**
- トークンを消す: Cloudflare の API Tokens で **Delete**。GitHub の Environment の秘密も消す

## 確かめたこと（11-05、dev の最初の成功、run 41937362702）
本人が Environment の `dev`・`demo` に秘密を置き（`main` だけ、`demo` は本人か先輩の承認）、「Run workflow」で `dev` を選んで走らせた。build と deploy のジョブがすべて成功した。
- **上の権限でデプロイ・migration が通る**（Workers Scripts・D1 の Edit、Account Settings の Read で足りた）
- **`d1 migrations apply` は CI で確認を聞かずに進む**（ログは「No migrations to apply!」。0002 まで入っていた）
- **`npm ci --ignore-scripts` のままで wrangler（esbuild）が動く**（70 ファイルを送り、`harvest-share-dev` を更新）
- それまでの 5 回（#125 のマージ〜11-04 夜）は、秘密が無くて失敗していた
- まだ: `demo` へのデプロイ（承認を通る流れ）と、migration が実際に新しい SQL を当てるとき
