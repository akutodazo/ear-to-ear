# パケットの一覧（無人運転用）

無人運転（本人・先輩どちらも。`/goal` か MCP の檻、AGENTS.md §5）に渡す作業単位。
**REPORT は 11-03 からパケットごと**（`docs/run/REPORT-Txx.md`）。取り込み済みの T01・T02・T04・T18・T19 の分は分けて置いた。下の項目の中の `docs/run/REPORT.md` は運転したときの名前。運転はパケットの番号で呼ぶ（「T01 の運転」）。
状態は人が書き換える: 予定 → RED済み（人） → 運転中 → 検査済み・人の確認待ち → 取り込み済み／止まった。
START ハッシュはここに書かない（`/goal` と運転記録だけ）。
**運転が済んだパケット（T00〜T29）は `docs/run/TASKS-done.md` に移した**（11-04。TASKS.md が約 9 万バイトになり、檻の read_file が返せず T30 の運転が止まったため。QUESTIONS の推奨）。新しいパケットはこのファイルの末尾に足し、運転と人の確認が済んだら TASKS-done.md に移す。

## 順番（11-02 時点）
| 順 | 項目 | 担当 | 無人 |
|---|---|---|---|
| 1 | T00 初期化 | 本人（対話） | — |
| 2 | T02 `candidates.ts` | 本人 | **試験1** |
| 3 | T03 `jpeg-segments.ts` | 先輩 | — |
| 4 | T17 安全検査の配線（`scripts/check-*`） | 本人（対話） | — |
| 5 | T05 `session-token.ts` | 先輩 | — |
| 6 | T01 `photo-meta.ts` | 本人 | 可 |
| 7 | T04 `upload-meta.ts` | 先輩 | 先輩の指示で無人（11-03） |
| 8 | T11 `0001_init.sql` | 先輩（対話） | — |
| 9 | T08 保存の失敗 | 先輩 | — |
| 10 | T09・T10 架空圃場・合成写真 | 本人（対話） | — |
| 11 | T06 `photo-groups.ts`（L1） | 本人 | 可 |
| 12 | T12 `status-reason.ts`（L1） | 本人 | 可 |
| 13 | T18 Worker の土台 | 先輩 | 先輩の指示で無人（11-03） |
| 14〜 | T07・T13・T14・T15・T16（L6・L8） | L0 の後に決める | — |

---

## T30 `handover-request`（L6 の Claude への要求の本文と返事の判定）
- **状態**: 検査済み・人の確認待ち（11-04）
- **運転の記録**: 1 回目（1104 の列車、START `ee2895c`）は 4 手・$0.11 で ask。TASKS.md が約 9 万バイトで檻の read_file が返せず、T30 の項目を読めなかったので、何も書かずに QUESTIONS に「T30 の項目を切り出す／TASKS を分ける」を推奨して止まった（正しい止まり方）。人が T00〜T29 を TASKS-done.md に移し（`8c821d4`）、先輩の承認で、同じ日に再開しない決まりの例外として 1104 の状態の記録の T30 を `T30-stopped-1` に名前を変えて起動し直した（費用は帳簿に残る）。この日の上限は $10・週次 42% に上げた（先輩）。2 回目: START `8c821d4` → GREEN `0f53632` → REPORT `c5bdb96`。Opus、11 手、$0.29。C1〜C5 合格（C3 43 件、C4 テスト全体 1918 件）。変更は許可した 1 ファイルだけ。REPORT に手元のパスなし
- **Claude の確認（11-04、人の確認の前）**: 差分を読んで抜けは見つからなかった（仮の実装と同じ形）。実装を 12 通りに壊して 12 通りとも落ちる（200 以外も読む 11・例外を外に出す 7・end_turn を見ない 5 ほか）
- **人の確認**: まだ
- **Issue**: #107（決めたことは #107 のコメント。ハンドラは T31 #111）
- **依存**: T27 `handoverContent`、T28 `toHandoverBlocks`、設定の `CLAUDE_MODEL`・`CLAUDE_MAX_TOKENS`
- **変えてよいファイル**: `src/services/handover-request.ts`（＋ `docs/run/REPORT-T30.md`、止まったときは `docs/run/QUESTIONS.md`）
- **テスト（凍結）**: `src/services/handover-request.test.ts`・`src/services/handover-request-delegate.test.ts`（`handoverContent`・`toHandoverBlocks`・設定を差し替えて、それに従うことを確かめる）
- **人が RED で置いたもの（凍結）**: `src/services/handover-prompt.ts`（指示文。人が書く）、`handover-request.ts` の型（`HandoverRequestBody`・`HandoverReply`）と空の関数
- **関数**: `buildHandoverRequest(fieldId, season, records): HandoverRequestBody`、`readHandoverReply(status, body, recordCount): HandoverReply`
- **合格条件**:
  - 要求の本文は `{ model: CLAUDE_MODEL, max_tokens: CLAUDE_MAX_TOKENS, thinking: { type: "between_tools" }, system: HANDOVER_SYSTEM_PROMPT, messages: [{ role: "user", content: [文書, { type: "text", text: HANDOVER_USER_TEXT }] }] }` の 5 項目だけ。文書は `{ type: "document", source: { type: "content", content: handoverContent(records) }, title: "<圃場> の <シーズン> 年の記録", citations: { enabled: true } }`。records が空なら例外（メッセージに「記録が無い」）
  - 返事の判定は例外を出さない。順に: 200 でなければ `http` → 本文がオブジェクトでなければ `shape` → `stop_reason` が `refusal` なら `refusal`、`max_tokens` なら `truncated`、`end_turn` 以外は `shape` → `toHandoverBlocks(content, recordCount)` の戻りを `blocks`、例外なら `shape`
  - 要素・引用の写しを自前で書かない（T27・T28 に任せる）。設定を直書きしない
- **決めたこと（先輩、11-04、#107 のコメント）**: SDK を入れず fetch で直接呼ぶ。秘密は `CLAUDE_API_KEY`。thinking は between_tools。断られたら 502（fallbacks なし）。記録 0 件は 422。指示文は人が書く。ハンドラは T31 に分ける。キーが入るまで claude.ai のアーティファクトを試作台にする
- **RED の確かめ（11-04）**: 空の実装で 39 件が失敗。仮の実装で全件と src・worker の全件が通り、檻の純粋さの検査も通ることを確かめた
- **攻撃役（Sonnet、檻の中、仕様・決まりのファイルを消した複製で）**:
  - 1 回目（6 手、$0.09）: 40 件を、ほぼ正しい実装（判定の多くを T28 に任せる）で通した。判定の順（200 以外は本文を見ない・refusal と max_tokens は content より先）と、空の content を 3 件足した
  - 入れなかった指摘: `recordCount` と records の数の食い違い（呼ぶ側が同じ records から渡す）、題の特殊文字（番号は一覧の中だけ）、指示文の中身（人が書いて凍結）
- **書き方の注意（`scripts/cage/policy.mjs`）**: import は `@/config`・`@/types`・`./handover-citations`・`./handover-document`・`./handover-prompt`。fetch・Date を使わない
- **参照**: `docs/spec.md` §6、K17、#107
- **担当**: 先輩

## T31 `POST /api/fields/:id/handover`（L6 の引き継ぎメモを作り直して保存する。admin だけ）
- **状態**: 検査済み・人の確認待ち（11-04）
- **運転の記録（1104 の列車、`--skip T23〜T30`）**: START `32823bd` → GREEN `3fc5f02` → REPORT `8af8137`。Opus、道具は檻の5つだけ、22 手、$0.63。C1〜C5 合格（C3 58 件、C4 テスト全体 1974 件）。変更は許可した 2 ファイルだけ。QUESTIONS なし。REPORT に手元のパスなし
- **Claude の確認（11-04、人の確認の前）**: 差分を読んで抜けは見つからなかった。実装を 15 通りに壊して 14 通りが落ち、残った「要素の数を渡さない」は、テストの返事の引用がどれも範囲の内側だったため。範囲の外を指す引用のテストを足し（人）、15 通りとも落ちる。手元の `wrangler dev`（使い捨ての合言葉、キーなし）で、Cookie なし 401・委員 403・管理者 503 `claude_disabled`・Z-99 404
- **人の確認**: まだ。**撮影位置・実データ・秘密に関わる PR**（Claude に送る経路と `CLAUDE_API_KEY`）なので、別のセッションのレビュー（AGENTS.md §3）を受ける
- **Issue**: #111（決めたことは #107 のコメント）
- **依存**: T27 `buildHandoverRecords`、T29 `handoverSeason`、T30 `buildHandoverRequest`・`readHandoverReply`、T22 `photoFromRow`、T23 `statusEventFromRow`
- **変えてよいファイル**: `src/services/usage-limit.ts`・`worker/handover-post.ts`（＋ `docs/run/REPORT-T31.md`、止まったときは `docs/run/QUESTIONS.md`）
- **テスト（凍結）**: `src/services/usage-limit-claude.test.ts`・`worker/handover-post.test.ts`・`worker/routes.test.ts`（POST の経路を足した）
- **人が RED で置いたもの（凍結）**: `worker/deps.ts` の `ClaudePort`・`ClaudeReply`・`Deps.claude`、`worker/env.ts` の配線（fetch・`CLAUDE_API_KEY`・`CLAUDE_ENABLED`・版 `2026-10-21`・30 秒・再試行なし、テスト `worker/env-claude.test.ts`）、`worker/http.ts` のエラーの種類（`too_many_requests`・`bad_gateway`・`claude_disabled`）、`worker/test-helpers.ts` の `claude: null`、`routes.ts` の配線、空の `postFieldHandover`・`claudeCounterKey`・`claudeDayEndsAt`
- **関数**: `claudeCounterKey(nowMs)`、`claudeDayEndsAt(nowMs)`、`postFieldHandover: Handler`
- **合格条件**:
  - `claudeCounterKey`: `claude:<日本時間の日付>`。`claudeDayEndsAt`: その日本時間の日の終わり（翌日の日本時間 0 時）の ISO。どの年でも計算する（表を持たない）
  - 順: `:id` が `deps.knownFieldIds` に無ければ 404 `not_found`（D1・Claude を触らない）→ `deps.claude` が null なら 503 `claude_disabled`（D1 を触らない）→ その圃場の判断（取り消しを含む全部、`STATUS_EVENT_COLUMNS`）と確定済みの写真（`state = 'confirmed' AND field_id = ?`、`PHOTO_LIST_COLUMNS`）を読み、`statusEventFromRow`・`photoFromRow` で写して `buildHandoverRecords(fieldId, handoverSeason(nowMs), …)` → 0 件なら 422 `{ error: "unprocessable", reason: "no_records" }`（数えない）→ 回数を 1 文で数える（`INSERT … ON CONFLICT(key) DO UPDATE SET count = count + 1 WHERE count < CLAUDE_DAILY_LIMIT RETURNING count`、`expires_at` は `claudeDayEndsAt`）。返らなければ 429 `too_many_requests`、`Retry-After` は日の終わりまでの秒（切り上げ、最小 1）→ `deps.claude(buildHandoverRequest(…))`（例外は `{ status: 0, body: null }` と同じ）→ `readHandoverReply` が失敗なら 502 `{ error: "bad_gateway", reason }`（保存しない。回数は数えたまま）→ `handover_notes` に 1 文の UPSERT（`ON CONFLICT(field_id, season)`、DELETE を使わない）で `{ records, blocks }` を保存し、200 で `HandoverNote`（`model` は `CLAUDE_MODEL`、`createdAt` は `nowMs` の ISO）
  - SQL は 4 文だけ（判断・写真・回数・保存）。`*` を使わない、番号は bind。`errorResponse`・`json` を使う
  - Claude に送るのは T30 の本文だけ（端末 ID・写真の id・候補・大きさ・R2 の鍵は T27 が文に入れない）。応答に Claude の返事の生の中身（id・usage）を出さない
- **決めたこと（先輩、11-04、#107 のコメント）**: 503 は `claude_disabled`。回数は呼ぶ前に数え、失敗も数える。保存する `model` は送ったモデル（fallbacks を使わないので答えるモデルと同じ）
- **RED の確かめ（11-04）**: 空の実装で 33 件が失敗。仮の実装で、攻撃役の後の 58 件と src・worker の全件が通り、檻の純粋さの検査も通ることを確かめた
- **攻撃役（Sonnet、檻の中、仕様・決まりのファイルを消した複製で）**:
  - 1 回目（15 手、$0.20）: 46 件を、回数の key をテストの時刻の表で返す・記録を読まず決まった 3 件を返す手抜きで通した。key の総当たり、年の境の別の圃場（写真だけ）、取り消しだけの圃場、429 で期限を変えない、例外でも数えるを足した
  - 2 回目（17 手、$0.25）: 49 件を、`A-01〜A-12` の形で判定・写真の state を見ない・回数を読んでから書く・上書きを消して入れる・2029 年より前だけ計算する手抜きで通した。1971〜2099 年、`knownFieldIds` の差し替え、番号の入った未確定の写真、2 つ同時、SQL 4 文・UPSERT・DELETE なしを足した
  - 入れなかった指摘: 保存の INSERT だけが失敗したとき（1 文の UPSERT で、失敗すれば前の行は残る）、返事の `model` を保存すること（送ったモデルを保存すると決めた）
- **書き方の注意（`scripts/cage/policy.mjs`）**: import は `@/config`・`@/services/...`・`./deps`・`./http`。`Date.now()` を使わず `deps.nowMs()`、fetch を使わず `deps.claude`。`src/services/usage-limit.ts` は今ある import（`../config`）を変えない
- **参照**: `docs/spec.md` §6、K17、#107・#111
- **担当**: 先輩

## T32 `handover-view`（L6 の引き継ぎメモを、画面の文と根拠の印に分ける）
- **状態**: 検査済み・人の確認待ち（11-04）
- **運転の記録**: 1104 の列車の 3 本目（T06・T12 は済みで飛ばした）。START `43b43c7` → GREEN `ce0ae68` → REPORT `9560953`。Opus、9 手、$0.34。ゲート G0〜G7 と C1〜C5 がすべて合格（C3 24 件、C4 テスト全体）。変更は許可した 1 ファイルと REPORT だけ。QUESTIONS なし。REPORT に手元のパスなし。列車の前に `.dev.vars` が無いことと wrangler が未ログインであることを確かめた
- **Claude の確認（11-04、人の確認の前）**: 差分を読んで抜けは見つからなかった（仮の実装と同じ形）。実装を 18 通りに壊して 5 つが生き残り、結果が変わらない 3 つを除く 2 つ（取り消しの印を文末だけで見る・start だけが整数でない引用）を落とすテストを足して 26 件
- **人の確認**: まだ
- **Issue**: なし（画面側のデータ層 #114 の続き。合格条件 13）
- **依存**: T27 `buildHandoverRecords` の記録の文の書き方（テストは T27 で作った記録を使う）、`HandoverNote` の型
- **変えてよいファイル**: `src/services/handover-view.ts`（＋ `docs/run/REPORT-T32.md`、止まったときは `docs/run/QUESTIONS.md`）
- **テスト（凍結）**: `src/services/handover-view.test.ts`（24 件。GREEN の後に人の確認で 2 件を足して 26 件）
- **人が RED で置いたもの（凍結）**: `handover-view.ts` の型（`HandoverSource`・`HandoverSentence`）、`NO_SOURCE_LABEL`、空の関数
- **関数**: `statusAnchorId(eventId): string`、`sourceLabel(record): string`、`handoverSentences(note): HandoverSentence[]`
- **合格条件**:
  - `statusAnchorId` は `status-event-<番号>`。判断の戻り先は `#` ＋ それ、写真の戻り先は `/api/photo-files/<id を encodeURIComponent>`
  - `sourceLabel` は T27 の文の先頭だけを読む。判断は「判断 月/日」（0 を付けない）、文末が「（YYYY-MM-DD に取り消し）」なら「（取り消し）」を付ける。写真は「写真 月/日」、撮影日不明なら「写真（撮影日不明）」。読めなければ「判断」「写真」
  - `handoverSentences` はブロック 1 つを 1 文にする（文は変えない、空白だけのブロックは出さない）。引用の範囲（end は含まない）を記録の数の内に切り、範囲の外は飛ばす。start・end が整数でない、start ≧ end の引用は無いものとする。文の中で同じ記録は 1 回、最初に引用された順、引用の部分は最初のもの（文字列でなければ空）。印が無ければ `uncited`
  - 記録の文の書き方を自前で作らない（テストは T27 の関数で記録を作る）。メモを変えない
- **RED の確かめ（11-04）**: 空の実装で 22 件が失敗（残り 2 件は空でも通る）。仮の実装（列車には渡さない）で 24 件とも通る
- **攻撃役（Sonnet、檻の中、仕様・決まりのファイルを消した複製で）**:
  - 1 回目（6 手、$0.09）: 22 件を、ほぼ正しい実装で通した。近道は取り消しを「に取り消し）」で終わるかだけで見たこと。T27 の書き方だけを印にするテストと、同じ記録を別の文が引用したらどちらにも印が付くテストを足して 24 件（攻撃役の実装は 1 件落ちる）
  - 入れなかった指摘: 月が 1 桁の例（「07」「08」で見ている）、複数桁の番号（`status-event-12` で見ている）、範囲外の日付・空の id・知らない種類（T27 と型が作らない）
- **書き方の注意（`scripts/cage/policy.mjs`）**: import は `@/types` だけ。fetch・Date を使わない
- **参照**: `docs/spec.md` §3・§7（`/fields/[id]` の引き継ぎメモ）、合格条件 13
- **担当**: 本人
