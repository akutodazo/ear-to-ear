# パケットの一覧（無人運転用）

無人運転（本人・先輩どちらも。`/goal` か MCP の檻、AGENTS.md §5）に渡す作業単位。
**REPORT は 11-03 からパケットごと**（`docs/run/REPORT-Txx.md`）。取り込み済みの T01・T02・T04・T18・T19 の分は分けて置いた。下の項目の中の `docs/run/REPORT.md` は運転したときの名前。運転はパケットの番号で呼ぶ（「T01 の運転」）。
状態は人が書き換える: 予定 → RED済み（人） → 運転中 → 検査済み・人の確認待ち → 取り込み済み／止まった。
START ハッシュはここに書かない（`/goal` と運転記録だけ）。
**運転が済んだパケット（T00〜T31）は `docs/run/TASKS-done.md` に移した**（11-04。TASKS.md が約 9 万バイトになり、檻の read_file が返せず T30 の運転が止まったため。QUESTIONS の推奨）。新しいパケットはこのファイルの末尾に足し、運転と人の確認が済んだら TASKS-done.md に移す。

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

## T33 `handover-post` の 502 に Claude の状態コード（#174 の弱点 4、#192）
- **状態**: 検査済み・人の確認待ち
- **運転の記録**: 11-07、檻の中で 1 本（relay の手順を手で）。START `dc6de93` → GREEN `450bb35` → REPORT `c1d99bc`。Opus、9 手、$0.40。C1〜C5 がすべて合格（C3 48 件、C4 の Vitest 2704 件・build 成功）。変えたのは `worker/handover-post.ts` だけ
- **Issue**: #192
- **変えてよいファイル**: `worker/handover-post.ts`（＋ `docs/run/REPORT-T33.md`、止まったときは `docs/run/QUESTIONS.md`）
- **テスト（凍結）**: `worker/handover-post.test.ts`
- **合格条件**:
  - Claude の返事を読めない 502 は `{error:"bad_gateway", reason, upstreamStatus}`。`upstreamStatus` は Claude の口が返した状態コード（口の例外・通信の失敗は 0、refusal・truncated・shape は 200）。`reason` は今のまま
  - 502 のときだけ `console.error` を 1 回・1 行。中身は理由と状態コードだけ。Claude の返事の本文（message・request_id・id）・例外の文・記録の文・端末の値を出さない
  - 200・422・429・503 では `console.error` を呼ばない
  - ほかの順（404 → 503 → 記録 → 422 → 429 → Claude → 502 → 保存）と 200 の本文は変えない
- **書き方の注意**: `worker/http.ts` の `errorResponse` は `reason` しか持てない（変えてよいファイルの外）。502 の本文は同じファイルの `json` で作る。新しい import は足さない
- **RED の確かめ（11-07）**: 今の実装で 18 件が失敗（残り 30 件は今の実装でも通る）。仮の実装（列車には渡さない）で 48 件とも通る
- **攻撃役（Sonnet、檻の中、docs を入れない複製で。実装は空にせず今の main の版を渡した。足すのは差分だけなので）**: 9 手、$0.29。ズルでは通せず、通した実装は本物と同じ形（`json(502, …)` と 1 行の `console.error`）。入れた指摘: 502 の応答ヘッダ（content-type・no-store・nosniff）を見ていない → 1 件足した。入れなかった指摘: ログの書式・圃場番号を入れないこと（仕様に無い。圃場番号は秘密ではない）、`retry-after` の下限・保存の失敗・記録の並び（T33 の範囲の外、前からある振る舞い）
- **凍結**: 11-07（48 件）
- **参照**: `docs/spec.md` §6（`POST /api/fields/:id/handover`）、AGENTS.md §1-3（秘密をログに出さない）
- **担当**: 先輩
