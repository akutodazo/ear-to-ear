# レビュー: PR #193（引き継ぎメモの 502 に Claude の状態コード、T33、Issue #192）

- レビューした者: 書いた会話を見ていない別の Claude Code のセッション（Opus 5.5）。受け取ったのは PR の番号と「AGENTS.md と docs/spec.md を読んでから見る」だけ
- 11-07。見た版: PR の先頭 `fa82b98`
- 読んだもの: AGENTS.md、`docs/spec.md`（§6 を中心に）、PR の差分（`worker/handover-post.ts`・`worker/handover-post.test.ts`・`docs/spec.md`・`docs/run/TASKS.md`・`docs/run/REPORT-T33.md`）、関係するコード（`worker/env.ts` の `createClaude`、`worker/http.ts`、`src/services/handover-request.ts` の `readHandoverReply`、`src/repositories/implementations/http-handover-repository.ts`、`wrangler.jsonc`）

## 手元で動かした結果（PR の先頭 `fa82b98`、`npm ci` の後）
- `npx vitest run worker/handover-post.test.ts`: 1 ファイル、48 件合格
- `npm run check`: 終了コード 0。安全検査 OK → lint はエラー 0（警告 2）→ 型 OK → Vitest 122 ファイル 2704 件合格 → build 成功

## 結論
**止める指摘はありません。直すべき指摘もありません。** 細かい指摘が 4 件あります。どれもこの PR のマージを止めるものではありません。

秘密と撮影位置の観点で確かめたこと:
- ログの 1 行に入るのは `read.reason` と `reply.status` だけ。`reason` は `readHandoverReply` が返す決まった 4 語（http・refusal・truncated・shape）のどれか。`reply.status` は本番では `fetch` の `response.status`（数）か 0（`createClaude` と `callClaude` の例外のとき）。Claude の返事の本文、例外の文、キー、記録の文がログや 502 の本文に入る道は無い
- キーは `createClaude` の見出しにだけあり、この PR はそこに触れていない
- `upstreamStatus` を見られるのは admin だけ（この口は admin 限定）。撮影位置や端末の値は、この口にもともと届かない
- 画面側（`http-handover-repository.ts`）は 502 を状態コードだけで見ている（`upstream-error`）。本文にキーが 1 つ増えても壊れない
- 失敗したときに保存しないこと、回数を数えること、ほかの状態コードの順は変わっていない（テストで確かめている）
- `docs/run/REPORT-T33.md` に手元のパス・ユーザー名・キーらしい文字は見当たらない（`sk-ant` や `C:/Users` で検索して 0 件）

## 指摘

| # | 重さ | 場所 | 中身 |
|---|---|---|---|
| 1 | 細かい | `worker/handover-post.ts:78` | ログの 1 行に圃場番号が無いので、ダッシュボードではどの圃場で失敗したか分からない。圃場番号（`A-01` の形）は架空で、秘密でも撮影位置でもない。管理者が 1 人で、押した直後にログを見るなら困らない。TASKS で「仕様に無いので入れない」と決めているので、このままでよい |
| 2 | 細かい | `worker/handover-post.test.ts`（外側の `it.each` と「口が例外を投げても」の 2 か所） | `vi.spyOn(console, "error")` を使っているのに、`afterEach` の `restoreAllMocks` は内側の `describe` にしか無い。`vitest.config` にも `restoreMocks` が無い。差し替えた `console.error` がこのファイルの後のテストに残り、思わぬ `console.error` を黙らせることがある。今は害が無い。次にこのファイルを触るときに、外側にも `afterEach` を置くとよい（テストは凍結済みなので、この PR では直さなくてよい） |
| 3 | 細かい | PR の本文の弱点候補 2 | `wrangler.jsonc:28` の上の段に `"observability": { "enabled": true }` がある。Wrangler では observability は env に受け継がれるので、dev でもログは取れるはず。ただし実際にダッシュボードで 1 行が見えるかは、dev で確かめていない（この弱点は「確かめていない」のまま残る） |
| 4 | 細かい | `docs/spec.md` §6 の 502 の行 | refusal・truncated・shape のとき `upstreamStatus` が 200 になることは TASKS には書いてあるが、spec の行には「Claude が返した状態コード」とだけある。画面で `upstreamStatus` を出すとき、「200 なのに失敗」に見えないよう、本人が画面を作る時点で spec に一言足すとよい |

## 見たが指摘にしなかったこと
- Claude が 429・529 を返したとき、こちらは 502 を返し `Retry-After` を付けない。前からある振る舞いで、T33 の範囲の外
- `worker/app.ts:42` の `console.error(error)` は、ハンドラが例外を投げたとき（保存の失敗など）に例外をそのまま出す。この PR の差分の外で、Claude の返事が例外に入る道も見当たらない
