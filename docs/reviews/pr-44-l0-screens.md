# レビュー: PR #44 L0 画面の骨組み（/upload と /recent）

## 対象
- PR: https://github.com/akutodazo/ear-to-ear/pull/44 （`feat/l0-screens` → `main`）
- コミット: `98daf08`（RED）／`e06db6d`（GREEN）／`1eb0443`（画面の骨組み）
- 差分の基準: `origin/main` = `d8dba25`（#41）。手元の `main`（`51ed560`）は古く、`git diff main...` には #41 の分が混ざるので、`git diff origin/main...feat/l0-screens` で読んだ（15 ファイル、+1000／-2）。GitHub の main はその後 #43（`6da6e9f`）まで進んでいる

## レビューした者
書いた会話を見ていない別の Claude Code のセッション（Claude Opus 5.5、`claude-opus-5-5`）。受け取ったのは PR の番号と「AGENTS.md と docs/spec.md を読んでから見る」という指示だけ。

## 読んだもの
- `AGENTS.md`、`docs/spec.md`、`docs/decisions.md`、`docs/privacy.md`
- 差分の全部（`src/repositories/**`、`src/services/photo-labels*`、`src/hooks/use-upload.ts`・`use-recent.ts`、`src/lib/upload-steps.ts`、`src/components/upload|recent/**`、`src/app/page.tsx`・`upload/`・`recent/`）。`globals.css` は `.thumb` とボタンの大きさだけ
- 関係する既存のファイル: `src/services/candidates.ts`、`src/types/index.ts`、`next.config.ts`、`package.json`、`tsconfig.json`、`node_modules/next/dist/docs/01-app/03-api-reference/02-components/image.md`
- PR の本文（ブラウザで読んだ）

## 結論
**マージを止める問題は無い**。撮影位置と候補までの距離は端末の中だけで使われ、送る meta は `UploadMeta` 型の5項目に限られている（型の注釈が余分な項目を拒む）。元の写真ファイルを `upload()` に渡す経路も無い（`preparePhoto` が必ず例外を出すので、いまは何も送られない）。
ただし、K6 の本当の守りどころ（meta を組み立てる処理と、縮小した画像を作る処理）がテストされていない。仕様書・層の決まりとの食い違いもある。下の 1〜3 は、T01（写真の情報の読み取り）と縮小・ハッシュが入る前に直すのを勧める。

## 指摘
| # | 重さ | 内容 | 勧める対応 |
|---|---|---|---|
| 1 | 中 | **K6 の守りにテストが無い**。meta を組み立てるのは `use-upload.ts` の `sendOne` だが、フックにテストが無い。PR 本文の AT-2「meta に距離・座標が無い」は、`http-photo-repository.test.ts` が「渡した meta がそのまま送られる」ことを確かめているだけで、組み立てる側に座標や距離が混ざっても捕まえられない。`preparePhoto` の戻り値は `Blob` なので、将来の実装が元の `File`（`File` は `Blob` の一種）をそのまま返しても型では止まらない | meta の組み立てを `src/services/` の純粋関数（例 `buildUploadMeta(info, candidates, chosenFieldId, contentHash)`）に出し、「キーが5つちょうど」「`position`・`meters` が出ない」ことをテストする。縮小を実装するパケット（`src/lib`）の合格条件に「戻り値は元のファイルと別物で、APP1〜15 が無い」を入れる。フックの中にも `prepared.image === file` なら止める守りを置く |
| 2 | 中 | **仕様書と食い違っている**。spec §4 の 1 と §7 の `/upload` は「合言葉 → 写真を選ぶ → …」の順だが、PR は「送って 401 が返ったときだけ聞く」。`未確定（選択 A-05）`・`未確定（候補なし）` も §7 に無い。§7 の「管理者の端末にだけ『確定・変更』」は未実装なのに、範囲外とも書いていない。それなのにセルフチェックは「仕様書の該当節と食い違っていない」に印が付いている | §4・§7 を PR の動きに合わせて直すか、本文に「後で直す」と書く。合言葉を聞く時機は K1 に関わる UI の決定なので、本人が承認して `docs/decisions.md` の期間中の決定に残す。「確定・変更」は L0 のどの PR でやるかを書く |
| 3 | 中 | **層の決まりに反する**。`src/components/upload/upload-screen.tsx` と `src/components/recent/recent-screen.tsx` が `useUpload`・`useRecent` を直接呼んでいる。AGENTS.md §4 の決まりは「UI 部品は props だけで受け取る」。中の `PhotoCard`・`PassphraseForm` は props だけで受け取っているので、問題は外側の画面2つだけ | フックを呼んで部品に配る外側を、page の層（例 `src/app/upload/upload-client.tsx`、`"use client"`）に移す。そのまま残すなら、例外にする理由を AGENTS.md に書く（共有ファイルなので両方の承認が要る） |
| 4 | 中 | **進め方**: GitHub の main に入った #43 の題名は「PR のマージは CI 成功で自動に」。PR #44 の本文は「マージの前にレビューする（未実施）」なので、このレビューが `docs/reviews/` に入る前に自動でマージされるおそれがある（#43 の中身と、PR #44 に当てはまるかは確かめていない） | このレビューのファイルと指摘への対応を入れるまで、PR #44 の自動マージを外しておく |
| 5 | 低 | 送っている間も「送る」ボタンが押せる（押せなくなるのは送れる写真が0枚のときだけ）。1枚目を送っている間にもう一度押すと、残りの写真が二重に送られる。サーバーは 409 で弾くが、画面には「同じ写真はもう送られています」と出て、委員を迷わせる | 送っている間はボタンを押せなくする（`sending` の印をフックに持つ） |
| 6 | 低 | 委員の手間（K1）: 合言葉で入れたあと、自動では送り直さない。もう一度「送る」を押す必要があり、本文の弱点候補にも説明が無い。読み取りに失敗した写真（`info` が null）も「送る（n枚）」の数に入るが、押しても送られない | 入れたら自動で送り直す。読めなかった写真は数から外し、「外す」だけ出す |
| 7 | 低 | `assignmentLabel` は、`state` が `confirmed` なのに `fieldId` が null の記録を「未確定（…）」と表示してしまい、データの矛盾が画面に出ない。`listRecent` は配列であることしか確かめず、中の各項目を検査せずに `UploadedPhoto[]` として扱う | どちらもサーバーが正しければ起きない。直すなら矛盾した記録は「確定（番号なし）」などで目立たせる。受け取りの検査は Worker 側の形が決まってからでよい |
| 8 | 軽微 | Service の `photo-labels.ts` が、Repository の層の型（`UploadOutcome`）を読み込んでいる。Service がブラウザ・fetch に依存していないので決まりの違反ではないが、依存の向きが逆 | 結果の種類を `src/types/` に移すか、そのままにする理由を書く |
| 9 | 軽微 | PR 本文のテスト件数の内訳が違う。本文は photo-labels 25 件・http-photo-repository 17 件、実際は 22 件・20 件（合計 42 件は合っている） | 本文を直す |
| 10 | 軽微 | 「外す」でカードを消しても、プレビューの `blob:` URL は解放されない（閉じたときにまとめて解放される）。本文にあるサブエージェントの利用は、AGENTS.md §3 の「基本使わない」の例外にあたる（本文に理由はある） | `remove` で `URL.revokeObjectURL` を呼ぶ。サブエージェントは本文の記載で足りる |

## 決まりとの照合
| 決まり | 結果 | 根拠 |
|---|---|---|
| K6 撮影位置・距離を端末の外に出さない | 守れている（ただし指摘1） | `use-upload.ts` の meta は `UploadMeta` 型の5項目だけ。`position` は `candidatesFor` の中、`meters` は画面の `candidateLabel` だけで使う。`upload()` に渡るのは `preparePhoto` の結果だけ |
| 元の写真ファイルを送らない | 守れている（いまは） | `preparePhoto` が必ず `PreparePhotoUnavailableError` を出し、`sendOne` は `repo.upload` の前に戻る。送る `File` は `filesByKey` に置かれ、`upload` には渡らない |
| K1 委員の手間 | おおむね守れている（指摘6） | 合言葉は 401 のときだけ聞く。番号は「分かるときだけ」選べばよく、選ばずに送れる |
| K2 未確定でも先に共有 | 守れている | 候補が無い写真も送れる流れ。新着に「未確定（候補なし）」と出る |
| K5 閲覧は合言葉なし | 守れている | `/recent` は `listRecent` を呼ぶだけで、合言葉を聞かない |
| AGENTS.md §4 Repository の実体を知るのは hooks だけ | 守れている | `createPhotoRepository` を呼ぶのは `use-upload.ts`・`use-recent.ts` だけ（差分を目で確かめた） |
| AGENTS.md §4 UI 部品は props だけ | 守れていない（指摘3） | `components/` の画面2つがフックを呼んでいる |
| AGENTS.md §4 Service は純粋関数 | 守れている | `photo-labels.ts` は文字列を組み立てるだけ |
| AGENTS.md §4 命名・`any`・`@ts-ignore`・`eslint-disable` の禁止 | 守れている | 差分に無い（目で確かめた）。lint はこの PR の分で 0 件 |
| AGENTS.md §3 RED と GREEN は別のコミット | 守れている | `98daf08`（RED）と `e06db6d`（GREEN）が別のコミット |
| AGENTS.md §3 引数なしの `toThrow()` を使わない | 当てはまらない | 新しいテストに例外を期待するものは無い |
| AGENTS.md §1 共有ファイルを変えていない | 守れている | `src/types/`・`src/config.ts`・`package.json`・`AGENTS.md` に差分が無い |
| AGENTS.md §1 実データ・画像・秘密を入れていない | 守れている | 画像・CSV は差分に無い。テストの値は `"phrase"`・`"a".repeat(64)`・`example.test` |
| Next.js 16 の静的書き出し | 問題は見つからない | `next.config.ts` に `images: { unoptimized: true }` があるので、`next/image`（`blob:`、`/api/photo-files/…`）は書き出しで通るはず。動的ルートは足していない。`"use client"` はコメントの後・import の前にあり、置き方として問題ない。`fill` の親の `.thumb` は `position: relative` がある。build は回していない |
| 仕様書との一致 | 食い違いあり（指摘2） | spec §4・§7 の合言葉の順、表示の文言、管理者の「確定・変更」 |

## 確かめたこと
- `git diff --stat origin/main...feat/l0-screens` → 15 ファイル。共有ファイル・画像・CSV は含まれない
- `npx vitest run` → `Test Files 17 passed (17)`、`Tests 558 passed (558)`
- `npx vitest run --reporter=verbose src/services/photo-labels.test.ts` → 22 件成功。`src/repositories` → 20 件成功
- `npx tsc --noEmit --incremental false` → 終了コード 0（`next typegen` は `.next/` にファイルを作るので回していない）
- `npx eslint src` → エラー 0、警告 1（`src/services/upload-meta.test.ts:25` の `_removed`。#41 の分で、この PR の差分ではない）
- 実行の前後とも `git status --porcelain --untracked-files=all` に変更の行は出ていない（リポジトリのファイルは変えていない）
- PR の本文と main のコミット一覧はブラウザで読んだ（#43 は題名だけ）

## 確かめていないこと
- `npm run build`・`next dev`・`npm run check:safety`（決まりにより回していない）。静的書き出しで通るかは、PR 本文の「`npm run check` 終了コード 0」と設定を読んだことに頼っている
- 実機（Android・iPhone）での表示と、`accept="image/jpeg"` での iPhone の写真の扱い
- PR 本文の AT-3（`/api/uploads` への送信が 0 件）は、コードを読んで正しいと判断しただけで、通信を見て確かめてはいない
- 最新の main（#43 の後）との競合と、#43 の自動マージが PR #44 に当てはまるか

## 指摘への対応（書いた側、11-03）
| # | 対応 |
|---|---|
| 1 | 対応した。meta の組み立てを `src/services/upload-request.ts` の `buildUploadMeta` に出し、5項目を1つずつ書き出す形にした。テスト4件（5項目ちょうど・撮影位置や距離が紛れても出ない・候補は新しい配列・null をそのまま）。フックに `prepared.image === file` なら止める守りを置いた。縮小のパケットの合格条件は、そのパケットの RED で入れる |
| 2 | 合言葉を要るときだけ聞くことは本人が承認 → spec §4・§7 と decisions に書いた。「未確定（選択 A-05）」は本人が承認しなかったので外し、表示は spec §7 のとおり（候補が無いときは「未確定」だけ）。管理者の「確定・変更」は L0 の次の PR（サーバーの `PATCH /api/photos/:id/assignment` ができてから） |
| 3 | 対応した。フックを呼ぶ外側を `src/app/upload/upload-client.tsx`・`src/app/recent/recent-client.tsx` に移し、`src/components/` は props だけの部品（`photo-card`・`passphrase-form`・`recent-list`）にした |
| 4 | 当てはまらなかった。#43 の決まりは「レビューが要る PR は、レビューに『止める』が無いことが条件」で、PR #44 には自動マージを付けていなかった |
| 5 | 対応した。送っている間は「送る」と写真の選び直し・番号の選択・外すを押せなくした |
| 6 | 対応した。合言葉を入れたら送り直す。読めなかった写真は数から外す |
| 7 | 前半は対応した（「確定（番号なし）」、テスト1件）。後半（各項目の検査）は Worker の形が決まってから |
| 8 | そのまま。`UploadOutcome` は画面と Repository の間だけで使う約束で、共有ファイル（`src/types/`）に置くと先輩の承認が要る。依存は型だけ |
| 9 | PR の本文を直した |
| 10 | 対応した（`remove` で URL を解放）。サブエージェントは本文の記載どおり |
