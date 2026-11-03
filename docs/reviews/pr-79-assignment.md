# レビュー: PR #79 PATCH /api/photos/:id/assignment（管理者の確定・変更と履歴、Issue #78）

## 対象
- PR: https://github.com/akutodazo/ear-to-ear/pull/79 （`feat/assignment-api` → `main`）
- 差分の基準: `git diff origin/main...origin/feat/assignment-api`（8 ファイル）。レビューした先頭は `f530cc8`（RED `a010a37`、GREEN `f530cc8`）

## レビューした者
書いた会話を見ていない別の Claude Code のセッション（Claude Opus 5.5、`claude-opus-5-5`）。受け取ったのは PR の番号と読み方（AGENTS.md・CLAUDE.md・docs/spec.md を読んでから見る）だけ。

## 読んだもの
- `AGENTS.md`、`CLAUDE.md`、`docs/spec.md`（§4 の確定・訂正、§5 の `uploaded_photos`・`photo_assignments`、§6 の API の表、§9 の合格条件 4〜6）
- 差分の全部: `src/services/assignment-request.ts`・`.test.ts`、`worker/assignment.ts`・`.test.ts`、`worker/routes.ts`、`worker/app.test.ts` の付け替え、`docs/spec.md`・`docs/decisions.md`
- 差分の外で関わるもの: `worker/body.ts`（`declaredTooLarge`・`readBodyLimited`）、`worker/router.ts`（`:id` は復号しない）、`worker/auth.ts` の `requireSession`、`worker/deps.ts`（`DbPort.batch`・`knownFieldIds`）、`worker/test-db.ts`（`node:sqlite` の batch は `BEGIN`〜`COMMIT` で await を挟まない）、`src/services/photo-query.ts`（返す 11 列）、`src/services/session-request.ts` の `isJsonContentType`、画面側の `src/repositories/implementations/http-photo-repository.ts` の `assign` と `src/services/assignment.ts` の `applyAssignment`
- 差分の全体で、秘密の名前、手元のパス、座標らしい名前、引数なしの `toThrow()` を探した。見つからなかった

## 手元で確かめたこと
PR のブランチ（`f530cc8`）を別の作業フォルダに出して `npm ci` → `npm run check`（Node v24）。**終了コード 0**。

```
check:safety: 199 ファイルを確認
check:safety: OK（名前・デモの JPEG・圃場の座標・秘密らしい文字列）
✖ 2 problems (0 errors, 2 warnings)
 Test Files  52 passed (52)
      Tests  1229 passed (1229)
✓ Compiled successfully in 1844ms
exit=0
```
lint の警告 2 つ（`upload-meta.test.ts` の `_removed`、`worker/index.ts` の無名の default export）は前からあるもの。テストの数 1229 件は PR 本文の数と一致する。

加えて、使い捨てのテスト（コミットしない。確かめた後に消した）で **違う番号の PATCH を同時に 2 本**（A-03 と A-07）流した。結果:
- 履歴は `null → A-03`、`A-03 → A-07` の 2 行で、前の番号が正しくつながる
- 応答の本文は **2 本とも `fieldId: "A-07"`**（A-03 を頼んだ側にも A-07 が返る）→ 指摘 1

`wrangler dev` での確認は PR 本文を読んだだけで、手元では動かしていない。

## 結論
**マージを止める指摘は無い**。

- 認可: 経路の表で `auth: "admin"`。委員は 403・なしは 401 で、何も書かれないことをテストが D1 の中身まで見ている。履歴の `actor_device` は Cookie の端末 ID（`requireSession`）で、本文からは取らない
- 入力の検証: Content-Type（415）→ 申告と実際の長さ（413、256 バイト）→ JSON・キーの許可リスト（`__proto__` も拒否）→ 番号は圃場の一覧と完全一致（422）。`:id` はバインドで渡すので SQL に混ざらない
- SQL・batch: 履歴の `INSERT … SELECT` を UPDATE より先に置き、両方に同じ条件 `id = ? AND NOT (state = 'confirmed' AND field_id IS ?)` を付けて 1 つの batch で流す。D1 の batch は 1 つの単位で動き、ほかの batch と交互にならないので、同じ番号が同時に来ても履歴は 1 行、違う番号なら前の番号が正しくつながる（上の確認）。無い写真はどの行にも当たらず、`photo_assignments.photo_id` の外部キーにも触れずに 404
- 返す項目: 新着と同じ 11 列（`PHOTO_LIST_COLUMNS`）。写真のハッシュ・R2 のキー・更新時刻は返さず、テストが本文の文字列まで見ている。撮影位置（K6）に関わる列は D1 に無い
- テスト: 条件を外す・履歴を書かない・順を逆にする・一覧の確認を外す・端末 ID を固定値にする、のどれでも落ちる作り（PR 本文の「壊す確認」と、テストを読んだ限りで一致）

## 指摘
| # | 重さ | 場所 | 要約 | 直し方の案 |
|---|---|---|---|---|
| 1 | 低 | `worker/assignment.ts:53-55` | **読み直しが batch の外**にあるので、違う番号の PATCH が同時に来ると、応答が**もう一方の結果**を返す（A-03 を頼んで 200 `fieldId: "A-07"`。上の確認で再現）。D1 と履歴は正しい。今の画面（`http-photo-repository.ts` の `assign`）は本文を読まず、頼んだ番号を手元で当てる（`applyAssignment`）ので、表示への影響は無い | 読み直しの SELECT を batch の 3 文目に入れ、その `results` を返す（同じ単位の中で読むので、自分の更新の直後の行になる）。または「応答は読み直した時点の行」と spec §6 に 1 行書く。L0 では後回しでよい |
| 2 | 低 | `worker/assignment.test.ts`（AT-8） | 同時の要求のテストが**同じ番号だけ**。違う番号が同時に来たとき、履歴の前の番号がつながる（`null → A-03`、`A-03 → A-07`）ことを確かめるテストが無い。今の実装は正しい（上の確認）が、INSERT を UPDATE の後ろに回すような変更は「続けて 2 回」のテストでしか捕まらない | 違う番号を `Promise.all` で 2 本流し、履歴の `from` が一方の `to` とつながることを見るテストを足す（人が書く。凍結の前） |
| 3 | 低 | `worker/assignment.ts`・`worker/routes.ts`・`worker/app.test.ts` | `worker/` は AGENTS.md §2 で**先輩の担当**。この PR は本人の側で書き、先輩のテスト（`app.test.ts`）も 1 か所変える。`decisions.md` に本人決定とあるが、PR 本文に先輩が知っているか・確認したかが無い。CLAUDE.md の「先輩の確認を待つ」例外は共有ファイルだけなので、マージを止めるものではない | PR 本文に「先輩に伝えた／確認済み」を 1 行足す。先輩の手元に同じ経路の作業が無いかだけ確かめる |
| 4 | 軽微 | `docs/spec.md` §6・`docs/decisions.md` | spec の表は「400（形の違う本文）／422（一覧に無い番号）」だが、`{"fieldId":7}`・`{"fieldId":null}`（型の違い）は **422**（テストもそう期待）。uploads の meta と同じ扱いで筋は通るが、表の言葉だけでは 400 と読める | spec §6 の 422 を「一覧に無い番号・文字列でない番号」に直す |

## 決まりとの照合
| 決まり | 結果 | 根拠 |
|---|---|---|
| K6 撮影位置を端末の外に出さない | 守れている | 返すのは 11 列の許可リスト。D1 に座標・距離の列は無い |
| 秘密を入れない・漏らさない | 守れている | 差分に秘密の値・手元のパスは無い。`check:safety` も OK。テストの Cookie は `test-helpers` の作り方 |
| 実データを入れない | 守れている | 画像の追加なし。番号は `A-01` 形式 |
| spec §4（番号の更新と履歴の追加は D1 の batch で一度に） | 合っている | INSERT と UPDATE を 1 つの batch |
| spec §6 の表 | 合っている（指摘 4 の言葉を除く） | この PR で表を詳しくした。「確定済みと同じ番号なら履歴なしで 200」は元の「＋履歴1行」からの変更で、`decisions.md` に理由がある |
| 層の決まり（ハンドラは薄く、判定は Service） | 合っている | 本文の検証と状態の対応は `assignment-request.ts`（純粋関数）、ハンドラは SQL と応答だけ |
| 定数は config に 1 回だけ | おおむね | 上限 256 バイトは Service の定数（`ASSIGNMENT_BODY_MAX_BYTES`）。共有ファイルの `src/config.ts` を変えない選び方で、`session` の上限と同じ置き方 |
| import は `@/` | 合っている | `@/services/...`、同じフォルダは `./` |
| RED と GREEN は別のコミット | 守れている | RED `a010a37`、GREEN `f530cc8`。GREEN でテストを 1 か所変えているが、`node:sqlite` の行を読み出す補助（prototype が null の行をふつうのオブジェクトに写す）だけで、期待の値は変えていない |
| 例外のテストに引数なしの `toThrow()` を使わない | 守れている | 差分に無い |
| 担当のフォルダ（§2） | 指摘 3 | 共有ファイル（`src/types/`・`src/config.ts`・`package.json`・`AGENTS.md`）は変えていない |

## 「止める」の指摘
なし。指摘 1〜3 は「低」、4 は「軽微」で、どれもマージの後に直してよい。

## 指摘への対応（書いた側、11-03）
| # | 対応 |
|---|---|
| 1 | **直した**。読み直しの SELECT を batch の 3 文目に入れ、その結果を返す。先にテストを足して再現（A-03 を頼んで A-07 が返る）してから直した。手元の `wrangler dev`（本物の D1 の模擬）でも、batch の中の SELECT が行を返し、無い写真は 404 になることを確かめた |
| 2 | **直した**。違う番号を同時に 2 本流し、応答がそれぞれ頼んだ番号であること、履歴の後の行の from が先の行の to とつながること、最後の番号が D1 の行と一致することを見るテストを足した |
| 3 | **本人から先輩に伝える**（PR 本文に書いた）。`worker/` の経路は本人決定（11-03）で本人の側で作った。先輩の手元に同じ経路の作業が無いかは、本人が先輩に確かめる |
| 4 | **直した**。spec §6 の 422 を「一覧に無い番号・文字列でない番号」に |
