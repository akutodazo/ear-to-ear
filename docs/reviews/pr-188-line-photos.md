# PR #188 のレビュー（L9: LINE のグループに送った写真を新着に「未確定」で入れる）

- 見た版: `feat/line-photo-receive` の `68d2101`（CI の `check` は成功）
- 見た人: 書いた会話を見ていない別の Claude Code のセッション（Opus 5.5）。AGENTS.md と docs/spec.md を読んでから見た
- 読んだもの: `worker/line-photos.ts`・`worker/line-webhook.ts`・`worker/env.ts`・`worker/deps.ts`・`worker/body.ts`・`src/services/line-jpeg.ts`・`src/services/line-image-event.ts`・`src/services/usage-limit.ts`、文書（decisions・spec・privacy・`docs/dev/line.md`）。テストは名前と合格条件の対応を見た程度
- 手元で試したこと: `keepImageSegmentsOnly` に小さな JPEG を組み立てて渡した（下の表）。この作業フォルダには `node_modules` が無いので `npm run check` は回していない（CI の成功を見た）

## まとめ
**「止める」は無し**。撮影位置（K6）について、保存する画像から APP0〜15・COM・スキャンの後ろ・EOI の後ろが消えることを、コードと手元の試しで確かめた。LINE の個人 ID・message ID・replyToken はログにも D1 にも残らない。直すべきは 2 件（文書の食い違いと、`waitUntil` の時間切れ）。

| # | 重さ | 指摘 |
|---|---|---|
| 1 | 直すべき | K6・AGENTS.md §1-4・privacy.md の「撮影位置はサーバーに送らない」が、LINE の道では言い切れなくなった。文書に書き分けが無い |
| 2 | 直すべき | 1 回の webhook の最悪の時間（10 枚 × 取得 10 秒＋返事 10 秒）が `waitUntil` の打ち切り（約 30 秒、推定）を大きく超える。途中で切られると枚数だけ数えて返事が来ない |
| 3 | 細かい | APP1（Exif の向き）・APP2（色のプロファイル）も捨てるので、向きや色が変わりうる。実機の台本に足す |
| 4 | 細かい | 残すセグメント（DQT など）は長さの欄ごと丸ごと写すので、表の後ろに付け足した文字は残る。「表だけ」は言い過ぎ |
| 5 | 細かい | 1 日の上限を超えた後にまとめて送ると、1 枚ごとに上限の返事が付く（最大 10 通） |

## 1. 撮影位置の決まりの文言が LINE の道と食い違う（直すべき）
- AGENTS.md §1-4 と K6 は「撮影位置は端末の外に出さない／サーバーに送らない」。privacy.md の 1 行目も「サーバーに送る: **送らない**」
- L9 では、端末が作ったバイト列（LINE が Exif を消すかは未確認、と PR 自身が書いている）が LINE のサーバーを通り、Worker のメモリに届く。保存の前に捨てるので「**残らない**」は守れているが、「**送らない**」は LINE の道では言い切れない
- decisions の 11-06 L9 は本人決定で、K6 に触れている。だから止めはしない。ただ、K6 の行・AGENTS.md §1-4・privacy.md の 1 行目は「Web の道」だけを前提にした文のまま
- 直し方の案（推奨は ①）:
  1. privacy.md の「撮影位置」の行に「LINE の道（L9）では LINE と Worker に届きうる。Worker は読まずに捨てて、残さない」と書き分け、decisions の L9 に「K6 の『送らない』は Web の道の話で、LINE の道は『残さない』で守る」と明記する。AGENTS.md（共有）を変えるなら両方の承認
  2. 実機（台本 4）で LINE が Exif を消していると確かめてから、その事実を privacy.md に書く（消していなければ 1 と同じ書き分けが要る）

## 2. `waitUntil` の打ち切りに収まらない（直すべき）
- `receiveInOrder` は 1 枚ずつ順に、各枚で `getContent`（`AbortSignal.timeout(10_000)`）と `reply`（同じく 10 秒）を待つ。D1・R2 も入る。最悪で 10 枚 × 約 20 秒 = 約 200 秒
- Workers の `waitUntil` は応答の後およそ 30 秒で打ち切られる（PR の弱点 2 と同じ推定）。切られると、その枚より後ろは取られず、**枚数は数えたまま（数えるのは取りに行く前）・返事も来ない**。上限を超えた分の 1 通（overflow）も来ない
- PR は弱点として挙げているが、手当てが無い。安い案（推奨は ①）:
  1. `receiveInOrder` に全体の締め切り（例: 開始から 20 秒）を持ち、過ぎたら次の枚を始めず、残りを overflow と同じ 1 通で知らせる
  2. `getContent` の打ち切りを短くする（例: 5 秒）
- テストは時刻を注入する形（`deps.nowMs`）で書ける

## 3. 向き・色が変わりうる（細かい）
- APP1 には Exif の向き（Orientation）、APP2 には色のプロファイル（ICC）、APP14 には Adobe の色の変換の印が入る。全部捨てるので、向きを Exif で持つ写真は横倒しに、P3 の写真は少し色が変わる
- LINE が縮め直すなら向きは画素に焼き込まれているはずで、起きない見込み（推定）。`docs/dev/line.md` の台本に「縦に撮った写真が縦のまま出るか」を足すとよい

## 4. 残すセグメントの中身はそのまま（細かい）
手元で `keepImageSegmentsOnly` に渡した結果:

| 入れたもの | 結果 |
|---|---|
| APP1（"Exif GPS"）と COM（"GPS"）を先頭に | 消える |
| スキャンの間に APP1、EOI の後ろに "GPS" | 消える |
| マーカーの前の詰め物（FF FF） | 通る |
| EOI が無い | null（受け取らない） |
| DQT の長さを伸ばして、表の後ろに "GPS" | **残る** |

- 端末やカメラが DQT の後ろに位置を書くことは無いので、K6 の実害は無い（わざと作った画像だけ）。スキャンの中身も同じく読まずに写す
- 文書（decisions・privacy・spec・line.md）の「画像の表だけを残す」は「残すセグメントの種類を決める（中身は確かめない）」の意味だと分かるように書くか、このままでよいと決めて残す

## 5. 上限の後の返事が多い（細かい）
- 1 日 30 枚を超えた後に 10 枚まとめて送ると、`limit` は受け取れなかった扱いなので 1 枚ごとに返事が付く（10 通）。reply は月の上限に数えないので費用の問題は無く、トークがうるさいだけ
- まとめて送った画像（imageSet）なら、上限の返事は最初の 1 枚だけにする手がある

## よかった点（確かめたこと）
- 受けるのは署名の検証の後、`settings.line_group_id` と一致するグループの画像だけ。`contentProvider.type` が `line` のものだけ取りに行き、外の URL は取らない。message ID は数字だけに絞ってから URL に入れる（`env.ts` でも重ねて確かめる）
- LINE からの取得は宣言の長さと読みながらの両方で 3MB に打ち切る
- 保存する画像は `keepImageSegmentsOnly` の後に Web と同じ `checkUploadImage`（APP1〜15 が無いこと・長辺 1600px）を通る。二重の見方は 2 段（先に SELECT、INSERT の `ON CONFLICT`）で、負けたら R2 を片付ける
- ログに出るのは種類と R2 のキー（写真の id）だけ。message ID・グループ ID・replyToken は出ない
- D1 の `taken_at_source` の CHECK に `none` がある・`uploader_device` は自由な文字なので、migration が要らないという説明は合っている。`uploader_device = 'line'` で権限が決まる場所は見当たらなかった
