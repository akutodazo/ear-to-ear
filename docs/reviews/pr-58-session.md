# レビュー: PR #58 T19 POST・GET /api/session

## 対象
- PR: https://github.com/akutodazo/ear-to-ear/pull/58 （`feat/session` → `main`）
- 差分の基準: `git diff origin/main...origin/feat/session`（20 ファイル）。レビューした先頭は `b39ab1a`
- コミット: RED 17 本、GREEN `e9cda9e`、REPORT `ef13a71`、TASKS の記録 `f0b4589`、main の取り込み `b39ab1a`

## レビューした者
書いた会話を見ていない別の Claude Code のセッション（Claude Opus 5.5、`claude-opus-5-5`）。受け取ったのは PR の番号と「AGENTS.md と docs/spec.md を読んでから見る」という指示だけ。

## 読んだもの
- `AGENTS.md`、`docs/spec.md`（§6 API・合言葉・試行回数、§8、§9）
- 差分の実装の全部: `src/services/usage-limit.ts`・`session-request.ts`、`worker/session.ts`・`routes.ts`・`auth.ts`・`http.ts`・`test-db.ts`・`test-helpers.ts`、`docs/decisions.md` の追加 1 行
- テストは `worker/session.test.ts` のテストの名前を全部と、content-length の例を読んだ。ほかのテストは拾い読み
- 関係する既存のファイル: `worker/env.ts`（照合と `hashIp`）、`worker/cookies.ts`、`worker/http.ts`、`src/config.ts`（`LOGIN_*`・`SESSION_DAYS`）、`migrations/` の `usage_counters`、`.github/workflows/check.yml`（Node 24）、前回のレビュー `docs/reviews/pr-47-worker-base.md`
- PR の本文
- PR の全コミットの差分で、手元のパス（`C:\Users\...` の利用者名）を探した。`ef13a71` の REPORT は `C:\Users\<ユーザー>\...` と伏せてあり、利用者名は無い

## 手元で確かめたこと
PR のブランチ（`b39ab1a`）で `npm ci` → `npm run check`。

`npm ci` は終了コード 0（`added 403 packages`。手元の Node は v25.9.0 で、vitest の `engines` の警告 EBADENGINE が出る。CI は Node 24）。`npm run check` は **終了コード 0**。

```
check:safety: 162 ファイルを確認
check:safety: OK（名前・デモの JPEG・圃場の座標・秘密らしい文字列）
✖ 2 problems (0 errors, 2 warnings)
 Test Files  40 passed (40)
      Tests  958 passed (958)
✓ Compiled successfully in 2.5s
✓ Generating static pages using 6 workers (5/5) in 862ms
check exit 0
```
lint の警告 2 つは `src/services/upload-meta.test.ts` の `_removed` と `worker/index.ts` の名前の無い default export（前からあるもの。PR 本文の「警告 2」と一致）。PR 本文のテスト数 923 件より多いのは、main を取り込んだ後（T10 など）の数のため（推定）。

`wrangler dev` での確認は、この PR の本文の記録を読んだだけで、手元では動かしていない。

## 結論
**マージを止める問題は無い**。

- 秘密: 合言葉は本文から照合（`env.ts` の HMAC → `timingSafeEqual`）に渡すだけで、D1・応答・ログに出ない（テスト「D1 に生の IP も合言葉も残らない」「console に何も出さない」）。テストに秘密の名前と値の組は無い（差分に `PASSPHRASE` が出るのは TASKS の申し送りの名前だけ）
- IP: D1 に入るのは `login:<hashIp の 43 文字>:<枠>` だけ。`hashIp` は `SESSION_SECRET` の HMAC で日付を含むので、spec §6「IP のハッシュ（SESSION_SECRET と日付で塩）」「生の IP は保存しない」と合う
- 撮影位置・実データ: この PR には出てこない
- spec §6 の表（204＋Cookie／401／429、`GET` は member 以上で 200 `{role}`）と合う。5 回の失敗までは 401、6 回目は合言葉が正しくても照合せず 429 で、「10 分に 5 回まで」の読み方として妥当
- 前回（PR #47）の指摘 1〜3（`env.ts` のテスト、長さが時間で漏れる、同じ合言葉で全員が管理者）は main 側で直っている（`env.test.ts`、HMAC してから比べる、同じ値なら例外）。6・7（CSRF・`__Host-`）は入れない理由が decisions に書かれた

気になるのは、本文の長さを `content-length` が無いときに読み切ってから見ている点（指摘 1）。止めるほどではないが、無料枠の CPU を食われる余地がある。

## 指摘
| # | 重さ | 内容 | 勧める対応 |
|---|---|---|---|
| 1 | 中 | **`content-length` が無い（chunked）か数でない要求は、本文を全部読んでから長さを見る**。`declaredTooLarge` が `false` を返すと `request.text()` が上限なしに読む。Workers は要求の本文を最大 100MB まで受けるので、認証なしの `POST /api/session` に大きな本文を送れば、1 回ごとにメモリと CPU（文字への復号）を使わせられる。回数の制限は本文を読んだ後なので効かない。「CPU 10ms に収まる処理だけ」（spec §6・AGENTS.md §4）に反しうる | `request.body` を読み進め、1024 バイト（または 4096 バイト程度）を超えた時点で読むのをやめて 413 にする。テストは「content-length なしで大きい本文 → 413」を足す。L0 の後に回すなら、弱点候補に書き足す |
| 2 | 低 | **`decisions.md` の追加行が「本人の承認待ち」のまま**。中身は回数の数え方と、CSRF・`__Host-` を入れない理由で、K1〜K17 は変えていない | マージの前に本人の承認を取り、行の「承認待ち」を消す（PR 本文の「確認したいこと 2」） |
| 3 | 低 | **`usage-limit.ts` は担当「後で決める」のファイル**（AGENTS.md §2）。先輩が作ったので、Claude・LINE の回数を足すときにだれが書くかが決まっていない | PR 本文の「確認したいこと 1」のとおり本人に確かめ、決まった担当を AGENTS.md §2 の表か decisions に残す |
| 4 | 低 | **IPv6 は 1 アドレスごとの枠**。1 つの回線が持つ /64 の中でアドレスを変えれば、10 分に 5 回の制限を事実上なくせる（PR 本文の弱点 5） | IPv6 なら上位 64 ビットに丸めてから `hashIp` に渡す（`clientIp` で）。L0 で入れないなら、合言葉を十分に長くすることを運用の決まりに書く |
| 5 | 低 | **`CF-Connecting-IP` を送り手が付けた値がそのまま使われないかは未確認**（PR 本文の弱点 1）。本番の Cloudflare は付け直す（推定）が、もし通るなら IP ごとの枠は無意味になる | dev の Worker（本物の Cloudflare 経由）で、ヘッダを付けて 401 を 6 回出し、6 回目が 429 になるかを確かめて PR か decisions に残す |
| 6 | 軽微 | 同時の失敗が 5 を超えて数えられる（PR 本文の弱点 2）。UPSERT なので数え落としは無く、次の要求から 429 になる | 対応不要（設計どおり） |
| 7 | 軽微 | `usage_counters` の古い行を消さない（弱点 4）。`expires_at` は入っている | L0 の後で、書くときに `expires_at` の過ぎた行を消す、または定期の掃除を足す |

## 決まりとの照合
| 決まり | 結果 | 根拠 |
|---|---|---|
| K6 撮影位置を端末の外に出さない | 対象外（守れている） | 座標・距離を扱う経路は無い |
| 秘密を入れない・漏らさない | 守れている | 合言葉は照合に渡すだけ。失敗の本文は `{ error }` だけ。テストが D1 と console を確かめている。`check:safety` も OK |
| 実データを入れない | 守れている | 圃場・写真・座標の追加は無い。テストの IP は文書用の範囲（`203.0.113.x`） |
| テストの秘密の名前（§1-6） | 守れている | テストに `PASSPHRASE`・`SESSION_SECRET` の文字列は無い |
| spec §6 `POST /api/session` | 合っている | 204＋Cookie（HttpOnly・Secure・SameSite=Lax・30 日）、401、429。端末 ID はログインのたびに `newId` |
| spec §6 `GET /api/session` | 合っている | member 以上、200 `{role}`、入っていなければ 401 |
| spec §6 試行回数・生の IP を保存しない | 合っている | 指摘 4・5 は強さの話で、決まりには反しない |
| CPU 10ms（spec §6・AGENTS.md §4） | 一部に懸念 | 指摘 1 |
| 層の決まり（ハンドラは薄く、判定は Service） | 合っている | 入力の検証は `session-request.ts`、枠と上限は `usage-limit.ts`（どちらも純粋関数）。ハンドラは順に呼ぶだけ |
| 例外のテストに引数なしの `toThrow()` を使わない | 守れている | 差分のテストに引数なしの `toThrow()` は無い。`getSession` の例外は `/session が無い/` を指定 |
| 担当のフォルダ（§2） | 本人の確認待ち | 指摘 3 |
| 決定の変更（§1-7） | 本人の承認待ち | 指摘 2。K1〜K17 は変えていない |
| 手元のパスを残さない | 守れている | REPORT のパスは利用者名を伏せてある |
| 自動マージ | 付けていない（正しい） | 無人運転・別のセッションのレビューが要る PR |

## 「止める」の指摘
なし。
