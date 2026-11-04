# マージでデプロイする（GitHub Actions）

11-04 本人決定（`docs/decisions.md`）。`.github/workflows/deploy.yml`。

| いつ | どこへ | すること |
|---|---|---|
| PR が main にマージされたとき（自動） | dev | `npm run check` → `d1 migrations apply --remote` → `wrangler deploy` |
| Actions の画面で人が「Run workflow」を押したとき | demo（選べば dev も） | 同じ。demo は Environment の承認を通ってから動く |

- PR（`pull_request`）では動かない。フォークの PR に秘密は渡らない
- 秘密の登録（合言葉・`SESSION_SECRET`・`CLAUDE_API_KEY`）は今までどおり本人の手元から（`docs/dev/cloudflare.md`）。デプロイしても Worker の秘密は消えない
- Claude はクラウドに触らない（`.claude/settings.json` の禁止は 11-03 のまま）。Claude ができるのは、マージで動いた結果を `gh run list --workflow deploy` で読むこと

## 人がすること（1 回、10 分）
**トークンの値を会話・Issue・PR・ファイルに貼らない**。

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

## 確かめていないこと
- 上の権限でデプロイ・migration が通るか（足りなければ、wrangler のエラーに出た権限を足す）
- `d1 migrations apply` が CI で確認を聞かずに進むか（wrangler は CI では聞かない、と理解している）
