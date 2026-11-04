# Cloudflare の動かし方（ear-to-ear）

設定は `wrangler.jsonc`。資源（11-02 作成、APAC）:

| 環境 | Worker | D1 | R2 |
|---|---|---|---|
| 手元（`wrangler dev`） | — | 手元の模擬（`.wrangler/`） | 手元の模擬 |
| dev（実機確認、HTTPS） | `harvest-share-dev` | `harvest-share-dev` | `harvest-share-photos-dev` |
| demo（審査員用） | `harvest-share-demo` | `harvest-share-demo` | `harvest-share-photos-demo` |

**分担（CLAUDE.md、11-03 本人決定、11-04 に緩めた）**: 手元で完結すること（下の「手元」）は Claude が実行してよい。dev・demo のデプロイと `d1 migrations apply --remote`、読むだけの操作は、Claude が bot のトークンで実行してよい（[`cloudflare-bot.md`](cloudflare-bot.md)）。秘密の登録・`d1 execute --remote`・R2 への書き込みは本人が行う（`.claude/settings.json` で Claude から止めている）。

## 手元で動かす（ログイン不要）
1. 手元の秘密を作る: `.dev.vars`（Git に入らない）に `MEMBER_PASSPHRASE`・`ADMIN_PASSPHRASE`・`SESSION_SECRET` を書く。値は手元の試し用でよい。**会話・Issue・PR・コミットに貼らない**。2つの合言葉は別の値にする（同じだと Worker が 500 を返す）
2. 画面を書き出す: `npm run build`（`out/` ができる）
3. 手元の D1 に表を作る: `npx wrangler d1 migrations apply DB --local`
4. 動かす: `npx wrangler dev`（`http://localhost:8787`）。`GET /api/health` が `{"ok":true}` なら Worker が動いている

手元の D1・R2 は `.wrangler/` に残る（Git に入らない）。作り直すときは `.wrangler/` を消す。

## クラウド（1 は本人だけ。2・3 は Claude も bot で行える）
本人は `npx wrangler login` の後に、Claude は bot のトークンで（ログイン不要）、環境ごとに `--env dev` または `--env demo` を付ける。

1. 秘密を登録する（値は入力を求められたときに貼る。コマンドに書かない）

   ```bash
   npx wrangler secret put SESSION_SECRET --env dev
   npx wrangler secret put MEMBER_PASSPHRASE --env dev
   npx wrangler secret put ADMIN_PASSPHRASE --env dev
   ```

2. 表を作る: `npx wrangler d1 migrations apply DB --remote --env dev`
3. デプロイ: `npm run build` の後に `npx wrangler deploy --env dev`
4. 終わったら、無人運転の前に `npx wrangler logout`（ハーネス §4-3）

引き継ぎメモ（L6）を本物の Claude で通すときは、1〜4 と確かめをまとめた `node scripts/ops/l6-live.mjs` を使う（`docs/dev/l6-live.md`）。

## やらないこと
- GitHub Actions に Cloudflare の秘密を置く・自動デプロイ（spec §10）
- 実在の写真・座標を dev・demo に入れる（K10）
- field-share など既存の資源に触る
