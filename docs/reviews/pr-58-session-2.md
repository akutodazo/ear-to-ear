# レビュー: PR #58 T19 POST・GET /api/session（2 回目）

## 対象
- PR: https://github.com/akutodazo/ear-to-ear/pull/58 （`feat/session` → `main`）
- 差分の基準: `git diff origin/main...origin/feat/session`（21 ファイル）。レビューした先頭は `d6d9a39`
- 1 回目のレビュー（`docs/reviews/pr-58-session.md`、`b39ab1a` 時点）の後に足されたコミット: RED `b902bdd`・`41e734a`、GREEN `96bba28`・`6db3867`、decisions `5c9b19c`、TASKS `1e2aa51`・`d6d9a39`

## レビューした者
書いた会話を見ていない別の Claude Code のセッション（Claude Opus 5.5、`claude-opus-5-5`）。受け取ったのは PR の番号と「AGENTS.md と docs/spec.md を読んでから見る」という指示だけ。1 回目のレビューをしたセッションとも別。

## 読んだもの
- `AGENTS.md`、`docs/spec.md`（§6 の API の表・合言葉の試行回数・CPU 10ms）
- 差分の実装の全部: `src/services/session-request.ts`・`usage-limit.ts`、`worker/session.ts`・`routes.ts`・`http.ts`・`auth.ts`・`test-db.ts`・`test-helpers.ts`、`docs/decisions.md` の追加 1 行
- テスト: `worker/session.test.ts` の準備の部分、「見えない動き（攻撃役の指摘）」、content-length と chunked の本文の例、IPv6 の例。`src/services/session-request.test.ts` の `clientIp` の例
- PR の本文と、1 回目のレビュー（指摘 1〜7 と PR 本文の「レビューへの対応」）
- 差分の全体で、秘密の名前（`PASSPHRASE`・`SESSION_SECRET`）、手元のパス（`C:\Users\…`）、文書用の範囲の外の IP アドレス、引数なしの `toThrow()` を探した。見つかったのは TASKS の申し送りの Secret の名前（値は無い）と、1 回目のレビューの文中の名前だけ

## 手元で確かめたこと
PR のブランチ（`d6d9a39`）で `npm ci` → `npm run check`。

`npm ci` は **終了コード 0**（手元の Node は v25.9.0 で、vitest の `engines` の警告 EBADENGINE が出る。CI は Node 24）。`npm run check` は **終了コード 0**。

```
check:safety: 163 ファイルを確認
check:safety: OK（名前・デモの JPEG・圃場の座標・秘密らしい文字列）
  25:18  warning  '_removed' is assigned a value but never used  @typescript-eslint/no-unused-vars
  10:1  warning  Assign object to a variable before exporting as module default  import/no-anonymous-default-export
✖ 2 problems (0 errors, 2 warnings)
 Test Files  40 passed (40)
      Tests  973 passed (973)
✓ Compiled successfully in 2.3s
✓ Generating static pages using 6 workers (5/5) in 809ms
check exit 0
```
lint の警告 2 つは前からあるもの（`upload-meta.test.ts` と `worker/index.ts`）。テストの数 973 件は PR 本文の「レビューの後の直し」の数と一致する。テストの途中に出る `LF will be replaced by CRLF` は、安全検査のテストが作る使い捨ての git リポジトリの中の警告で、作業ツリーは変わっていない（`git status` は空）。

**並列の失敗の確かめ（使い捨て。コミットしていない）**: `worker/` に一時のテストを置き、偽の D1（`createTestDb`）と常に不一致を返す `matchPassphrase` で、同じ IP から `POST /api/session` を 50 本同時に送った。結果は **50 本とも 401、429 は 0 本、照合は 50 回、`usage_counters` の count は 50**。確かめた後にファイルは消した（`git status` は空）。本物の D1 では要求ごとの往復の時間が違うので本数は変わる（推定）が、「数を読む → 照合 → 数を足す」の間に別の要求が入れる形は同じ。

`wrangler dev` での確認は PR 本文の記録を読んだだけで、手元では動かしていない。

## 結論
**マージを止める問題は無い**。

- 1 回目の指摘 1（本文を上限なしに読む）は直っている。`readBodyLimited` が読みながらバイトで数え、1024 バイトを超えた所で `reader.cancel()` して 413。`content-length` が無い・数でない・偽りの場合のテストがあり、テストは読まれたバイト数が上限の近くで止まることまで見ている。多バイト文字は全部つないでから復号していて、区切りで壊れない
- 1 回目の指摘 4（IPv6 の枠）も直っている。`clientIp` が `::` を広げて上位 4 グループを取り、先頭の 0 と大文字を正規化して `…::/64` にまとめる。IPv4 と IPv4 を写した IPv6 はそのまま。テストの IP は文書用の範囲（`203.0.113.x`、`2001:db8::/32`）
- 秘密・IP の扱いは 1 回目の結論のまま変わっていない（合言葉は照合に渡すだけ、D1 の key は `login:<hashIp>:<枠>`、生の IP は残らない）。撮影位置・実データはこの PR に出てこない
- spec §6 の表（204＋Cookie／401／429、`GET` は member 以上で 200 `{role}`）と合う

新しく気になったのは、**同時に送った失敗は 5 回の上限を越えて照合される**こと（指摘 1）。1 回目は「数え落としは無い」として軽微にしていたが、数え落としが無いことと、照合の回数が 5 に収まることは別で、送る側が同時に送る本数を増やせば 10 分ごとの照合の回数を増やせる。合言葉の推測を遅らせるという spec §6 の目的を弱めるので「中」にした。ただし、合言葉を十分に長くしていれば実害は小さく、L0 の範囲で止めるほどではない。

## 指摘
| # | 重さ | 内容 | 勧める対応 |
|---|---|---|---|
| 1 | 中 | **同時に送った失敗は上限 5 を越えて照合される**。`postSession` は `SELECT count` → `matchPassphrase` → UPSERT の順で、読んでから足すまでの間に同じ枠の要求が何本でも入れる。手元の偽の D1 で 50 本同時に送ると、50 回照合され 429 は 0 本だった。1 回目の指摘 6・PR 本文の弱点 2 は「次の要求から 429」としているが、同時に送る本数を送る側が決められるので、1 つの枠で試せる回数に上限が無い | 照合の前に 1 文で数を足して読む（`INSERT … ON CONFLICT(key) DO UPDATE SET count = count + 1 RETURNING count`）。足した後の数が上限を超えたら照合せずに 429、照合が一致したら 1 つ戻す（または「成功も数える」に決定を変える。10 分に 5 回なら委員の使い方には響かない）。テストは「同時に 10 本の失敗 → 照合は 5 回まで」。L0 の後に回すなら、#59 と PR 本文の弱点に「同時に送れば上限を越える」と書き直し、合言葉を十分に長くすることを運用の決まりに書く |
| 2 | 低 | **`decisions.md` の追加行が「本人の承認待ち」のまま**（1 回目の指摘 2 と同じ）。IPv6 の /64 と、本文を読みながら守ることが足されて中身が増えた | マージの前に本人の承認を取り、「承認待ち」を消す。指摘 1 の対応で数え方を変えるなら、同じ行を直してから承認を取る |
| 3 | 低 | **`usage-limit.ts` の担当が決まっていない**（1 回目の指摘 3 と同じ。AGENTS.md §2 では「後で決める」） | PR 本文の「確認したいこと 1」のとおり本人に確かめ、AGENTS.md §2 か decisions に残す |
| 4 | 低 | **`CF-Connecting-IP` を送り手が付けた値が通らないかは未確認**（1 回目の指摘 5 と同じ）。`clientIp` は形の崩れた値も受ける（例 `1:2:zz::` は `1:2:NaN:0::/64` になる）。本番の Cloudflare は付け直す（推定）ので実害は無い見込み | dev の Worker で、ヘッダを付けて 6 回失敗し、6 回目が 429 になるかを確かめて記録する（#59 のとおり） |
| 5 | 軽微 | 429 になった要求も毎回 D1 を 1 回読む。止められた後も送り続ける相手は、D1 の読み取りの回数（無料枠）を使わせられる | L0 では対応不要。気になれば Cloudflare の Rate Limiting の規則を `/api/session` に足す（コードの外） |
| 6 | 軽微 | `declaredTooLarge` と `readBodyLimited` に渡す上限の名前が `SESSION_BODY_MAX_CHARS`（文字）で、使い方はバイト | 名前を `SESSION_BODY_MAX_BYTES` にするか、コメントで「文字数 ≤ バイト数なので同じ値で足りる」と書く（`session-request.ts` には書いてある）。直さなくてもよい |
| 7 | 軽微 | `usage_counters` の古い行を消さない（1 回目の指摘 7 と同じ） | L0 の後で掃除を足す（#59 のとおり） |

## 決まりとの照合
| 決まり | 結果 | 根拠 |
|---|---|---|
| K6 撮影位置を端末の外に出さない | 対象外（守れている） | 座標・距離を扱う経路は無い |
| 秘密を入れない・漏らさない | 守れている | 合言葉は照合に渡すだけで、D1・応答・ログに出ない（テストが D1 と console を確かめる）。差分に秘密の値は無い。`check:safety` も OK |
| 実データを入れない | 守れている | 圃場・写真・座標の追加は無い。テストの IP は文書用の範囲 |
| テストの秘密の名前（§1-6） | 守れている | テストの合言葉は `member-pass-for-test` などの値だけで、秘密の名前と値の組は無い |
| spec §6 `POST /api/session` | 合っている | 204＋Cookie、401、429 と `Retry-After` |
| spec §6 `GET /api/session` | 合っている | member 以上、200 `{role}`、入っていなければ 401。経路の表の末尾に足し、`Allow: POST, GET` |
| spec §6 試行回数「10 分に 5 回まで」 | 一部に懸念 | 1 本ずつ送れば守られる。同時に送ると越えられる（指摘 1） |
| spec §6 生の IP は保存しない | 合っている | key は `hashIp`（`SESSION_SECRET` と日付で塩）の値だけ。IPv6 は /64 にまとめてからハッシュ |
| CPU 10ms（spec §6・AGENTS.md §4） | 合っている | 本文は 1024 バイトを超えた所で読むのをやめる（1 回目の指摘 1 は解消） |
| 層の決まり（ハンドラは薄く、判定は Service） | おおむね合っている | 入力の検証は `session-request.ts`、枠と上限は `usage-limit.ts`（純粋関数）。本文を読みながら数える `readBodyLimited` は `worker/session.ts` にあるが、ストリームを扱うので Service に置けず、妥当 |
| RED と GREEN は別のコミット | 守れている | `b902bdd`→`96bba28`、`41e734a`→`6db3867` |
| 例外のテストに引数なしの `toThrow()` を使わない | 守れている | 差分に引数なしの `toThrow()` は無い |
| 担当のフォルダ（§2） | 本人の確認待ち | 指摘 3 |
| 決定の変更（§1-7） | 本人の承認待ち | 指摘 2。K1〜K17 は変えていない |
| 手元のパスを残さない | 守れている | 差分に利用者名を含むパスは無い |
| 自動マージ | 付けていない（正しい） | 無人運転・別のセッションのレビューが要る PR |

## 「止める」の指摘
なし。指摘 1 は「中」で、直すか、弱点として書き直して合言葉の長さで補うかを本人が決める。
