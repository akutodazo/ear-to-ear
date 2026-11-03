# PR #48 レビュー: 縮小とハッシュ（送る前に縮小・再エンコードし、APP1〜15 を取り除いて確かめる）

## 対象
- PR: https://github.com/akutodazo/ear-to-ear/pull/48（ブランチ `feat/prepare-photo` → `main`）
- コミット（`git log origin/main..feat/prepare-photo`）:
  - 4d91119 RED: SHA-256・縮小の大きさ・送る前の最後の確かめのテスト 16 件
  - 6adc757 GREEN: SHA-256・縮小の大きさ・送る前の最後の確かめ
  - 6669e0b RED: stripAppSegments のテスト 4 件
  - e2eadcd GREEN: stripAppSegments
  - fded3db ブラウザで縮小・再エンコードし、APP2 などを取り除き、最後に APP1〜15 と大きさを確かめてから送る
- 差分: 9 ファイル、+251 / −10

## レビューした者
書いた会話を見ていない別の Claude Code のセッション（Claude Opus 5.5、`claude-opus-5-5`）。読むだけで、リポジトリのファイルは作らず・変えていない。

## 読んだもの
- `AGENTS.md`、`docs/spec.md`（§4 流れ・写真の位置情報、§5 meta、§8 技術とフォルダ、§9 合格条件）、`docs/decisions.md`（K6・K7）、`docs/privacy.md`
- PR の本文（`gh pr view 48`）、差分の全部（`git diff origin/main...feat/prepare-photo`）、各コミットの中身
- 差分の外で関係するもの: `src/services/jpeg-segments.ts`（inspectJpeg）、`src/hooks/use-upload.ts`、`src/repositories/implementations/http-photo-repository.ts`（upload）、`src/config.ts`、`worker/`

## 結論
**マージを止める問題は無い。**
- 送る画像は、元のファイルを `createImageBitmap` で画素にして `OffscreenCanvas` で JPEG にし直したもの。元のバイト列が送る画像に入る経路は無い（`preparePhoto` が返すのは `stripAppSegments` の結果から作った新しい Blob だけ。`use-upload.ts` には `prepared.image === file` の守りも残っている）
- Chromium（Chrome 152）で、再エンコードした JPEG に EXIF が残らないこと、APP2（ICC）が付くこと、Orientation が画素に反映されることを確かめた
- 確かめ（`stripAppSegments` と、`inspectJpeg` による `checkPreparedJpeg`）は、読めないもの・切れたもの・長さがおかしいものでは送らない側に倒れる。20 万件の乱数で壊した入力でも、SOS より前に APP1〜15 を残したまま「送る」になった例は無い
- 気を付ける点: 今は Worker 側にアップロードの処理（APP1〜15 の検査）がまだ無く（`worker/` には `migrations.test.ts` だけ）、ブラウザの確かめが唯一の守り。その配線にテストが無い（#1）

## 指摘
| # | 重さ | 内容 | 勧める対応 |
|---|---|---|---|
| 1 | 中 | `preparePhoto`（`src/lib/upload-steps.ts`）の流れにテストが無い。流れとは「取り除いた結果を `checkPreparedJpeg` に通す → 通ったものだけ返す → 大きすぎるときだけ画質を下げる」こと。例えば `stripped` ではなく `encoded`（APP2 付き）を返す、確かめを外す、といった誤りがあってもテストは通る。Worker の APP1〜15 の検査がまだ無いので、spec §9-2 はこの配線に頼っている | 流れを Service の純粋関数にする（例: `prepareJpeg(encode: (q) => Promise<Uint8Array>, qualities, maxBytes, inspect)`）。そのうえで「取り除いた結果を返す」「APP が残れば止める」「大きすぎるときだけやり直す」「読めなければすぐ止める」をテストする。または Worker 側の検査（spec §4 の 5）が入るまでの既知の弱点として PR 本文に書く |
| 2 | 低 | やり直すかどうかを、`checkPreparedJpeg` が返す文字列 `"縮小しても大きすぎる"` と完全に一致するかで決めている。テストは `.not.toBeNull()` だけなので、文言を変えるとやり直しが黙って効かなくなる（1 回目で止まる） | 理由を種類で返す（例 `{ kind: "too-large" }` と表示用の文）。少なくとも大きすぎる場合のテストを `toBe("縮小しても大きすぎる")` にする |
| 3 | 低 | 最後の確かめが見るのは、最初の SOS より前の APP1〜15 だけ。COM（FE）・JPGn（F0〜FD）・2 つめのスキャンの前の APP・EOI の後ろの付け足しは見ていない（手元で試すと、どれも「送る」と判定され、中身の文字も残った）。今の流れは canvas の出力なのでこれらは出ないが、spec §4 の「公開側に残してよいメタデータは無い」よりも守りが狭い | 今の PR では直さなくてよい。弱点としてコメントか PR 本文に書く。必要になったら、SOS より前は APP0・DQT・SOF・DHT・DRI だけを残す（許可リスト）方式と、EOI の後ろを切ることを考える |
| 4 | 軽微 | `stripAppSegments` は、マーカーの前の詰め物（FF FF …）を `inspectJpeg` のように読み飛ばさない。正しい JPEG でも null（「JPEG として読めない」）になる。送らない側に倒れるので安全上の問題は無く、canvas の出力には出ない | 2 つの解析の違いとしてコメントに書く。または `inspectJpeg` と同じく詰め物を読み飛ばす |
| 5 | 軽微 | テストの穴: APP15（`0xef`）・長さ 1・SOS が無い場合のテストが無い（`marker <= 0xee` に変えても、`stripAppSegments` のテストは通る。ただし `checkPreparedJpeg` が止める） | 余裕があれば `stripAppSegments` のテストに APP15・長さ<2・SOS なしを足す |
| 6 | 軽微 | 送れないときの画面の文言に `APP2` などの専門用語がそのまま出る（`この写真は送れませんでした（メタデータ（APP2）が残っている）`） | 委員向けには「写真の情報を消しきれなかった」などに言い換え、APP の番号は開発者向けの記録だけにする |
| 7 | 軽微 | PR 本文に AGENTS.md §3 の「影響範囲」「使ったライブラリ」「同時に更新した文書」の欄が無い。spec §8 の主な Service の一覧に `prepared-photo`・`resize-plan` が無く、spec §4 の「メタデータは全部消える」は、Chrome が APP2 を付けることと合っていない | PR 本文に 3 つの欄を足す（文書は「更新なし」でも明記）。spec §4・§8 に追記する（APP2 を取り除くこと、Service 名） |
| 8 | 軽微 | 画質を変えてやり直すたびに `createImageBitmap` で元の写真を最初から読み直している。縮小の画質の指定（`resizeQuality`／`imageSmoothingQuality`）が無い | 動きには影響しない。気になれば、縮小した画素を一度だけ作って画質だけ変える |

## 決まりとの照合
| 決まり | 結果 | 根拠 |
|---|---|---|
| K6 撮影位置を端末の外に出さない | 守れている | 送るのは canvas の再エンコードの結果だけで、元のバイト列を含まない。Chromium で EXIF（Orientation）付きの JPEG を通し、出力に `Exif` が無いことを確かめた。meta は既存の `buildUploadMeta`（5 項目）のまま |
| AGENTS §1-4 公開側の画像に APP1〜15 を残さない | 守れている（最初の SOS より前について） | `stripAppSegments` → `checkPreparedJpeg(inspectJpeg)`。SOS より後ろ・COM などは #3 |
| 元のファイルを送らない | 守れている | `preparePhoto` は `new Blob([stripped])` だけを返す。`use-upload.ts` の `prepared.image === file` の守りも残っている。`http-photo-repository.ts` は受け取った Blob を `photo.jpg` の名前で送る（元のファイル名も出ない） |
| K7 二重登録は元ファイルのハッシュ | 守れている | `sha256Hex(await file.arrayBuffer())`。縮小の前の元ファイルから計算 |
| AGENTS §1-1〜3・5・6 既存コード・実データ・秘密・画像・テストの秘密名 | 問題なし | 差分に画像・CSV・秘密らしい文字列・座標は無い。テストのバイト列は手で組み立てた架空のもの |
| AGENTS §2 担当のフォルダ | 問題なし | 変更は `src/lib/`・`src/services/`・`src/hooks/` だけ。共有ファイル（`src/types/`・`src/config.ts`・`package.json`・`AGENTS.md`）と先輩の `jpeg-segments.ts` は変えていない（import するだけ） |
| AGENTS §3 RED と GREEN は別のコミット | 守れている | 4d91119→6adc757、6669e0b→e2eadcd。RED のコミットの実装は `not implemented` の仮 |
| AGENTS §3 引数なしの `toThrow()` を使わない | 守れている | 新しいテストに `toThrow` は無い |
| AGENTS §3 PR 本文の項目 | 一部欠け | #7 |
| AGENTS §4 層の決まり | 守れている | `prepared-photo.ts`・`resize-plan.ts` は純粋関数（解析は引数で注入）。ブラウザ API（`createImageBitmap`・`OffscreenCanvas`・`crypto.subtle`）は `src/lib/` だけ。`any`・`@ts-ignore`・`eslint-disable` は無い（`as BufferSource`・`as BlobPart` の型の言い換えはある） |
| AGENTS §4 言葉を盛らない | 概ね守れている | 本文で、実機（縦向き・Safari）は確かめていないと書いている |

## 確かめたこと
1. **CI**: `gh pr checks 48 -R akutodazo/ear-to-ear` → `check pass 1m18s`
2. **PR 本文のテストの数と実際**: sha256 3 件、resize-plan 8 件（`it.each` 4 件と単独 4 件）、checkPreparedJpeg 5 件、stripAppSegments 4 件。本文の「16 件」「9 件（prepared-photo）」と一致
3. **JPEG 解析の端**（リポジトリの外の一時フォルダで、Node 24.19.0 の型の取り除きで `prepared-photo.ts`・`jpeg-segments.ts` をそのまま読み込んで実行）:
   | 入力 | stripAppSegments | 最後の確かめ |
   |---|---|---|
   | APP0＋APP1（Exif） | 38B、Exif なし | 送る |
   | 詰め物 FF FF E1 | null | 送らない |
   | APP15 | 取り除かれる | 送る |
   | COM（中身 `GPS!`） | 残る | 送る（#3） |
   | 2 つめのスキャンの前の APP1 | 残る | 送る（#3） |
   | EOI の後ろの APP1 | 残る | 送る（#3） |
   | 長さ 1 | null | 送らない |
   | SOS が無い | null | 送らない |
   | `FF DA` で切れる | null | 送らない |
   | SOF が無い | 16B | JPEG として読めない |
   | SOS の前に EOI | null | 送らない |
4. **乱数で壊した入力**（APP0・APP15・APP1・COM・SOF・SOS・EOI の並びに 1〜3 か所の書き換え・削除・挿入を 20 万回）: null 152,137／止める 11,322／送る 36,541。「送る」のうち SOS より前に中身の文字が残った 128 件は、すべてマーカー自体が APP 以外（FA など JPGn や COM）に変わったもので、APP1〜15 として残った例は 0 件（#3 と同じ種類）
5. **Chromium での再エンコード**（アプリの内蔵ブラウザ、Chrome/152.0.7977.167、https://example.com のページの中でだけ実行。どこにも送っていない）:
   - 40×20 の画像を `OffscreenCanvas.convertToBlob` で JPEG にした結果の SOS までのマーカー: `e0,e2,db,db,c0,c4,c4,c4,c4,da` → APP2 が必ず付くという PR 本文の説明どおり
   - その JPEG に EXIF（Orientation=6）を差し込み、`createImageBitmap(..., { imageOrientation: "from-image" })` → 20×40 になり、上の画素は赤（左にあった色）→ 向きは画素に反映される
   - それを描き直して再エンコードした結果: マーカーは同じく `e0,e2,…`、`Exif` の文字は無い
6. **Worker 側の検査**: `worker/` には `migrations.test.ts` だけで、アップロードの処理（APP1〜15 の検査）はまだ無い（`grep -rln inspectJpeg` で該当は `scripts/safety-rules.ts`・`src/` だけ）
7. **作業フォルダ**: `git status --porcelain --untracked-files=all` → 出力なし（何も変えていない）

## 確かめていないこと
- `npm run check`・`vitest` は手元で回していない（キャッシュなどがリポジトリの中にできるのを避けた。CI の結果に頼った）
- 実機（Android の Chrome・iPhone の Safari）での縮小・向き・`OffscreenCanvas` の動き（PR の弱点候補 1・2 と同じ）
- 実際の 4000×3000 の写真での大きさ（3MB 以下に収まるか）と画質
- `next dev` での画面全体の流れ（PR 本文の AT-1・AT-2 の再現はしていない）

## 指摘への対応（書いた側、11-03）
| # | 対応 |
|---|---|
| 1 | 対応した。流れを `src/services/prepared-photo.ts` の `prepareJpeg(encode, qualities, maxBytes, inspect)` に移し、テスト5件（取り除いた後を返す・APP が残れば止めてやり直さない・大きすぎるときだけやり直す・全部大きすぎれば too-large・読めなければすぐ止める）。`preparePhoto` はこれを呼ぶだけにした。直した後も内蔵ブラウザで、1600×1200・SOS より前は APP0 だけ・`drone-dji` なし・meta 5項目・ハッシュ一致を確かめた |
| 2 | 対応した。`checkPreparedJpeg` は `{ kind: "ok" \| "too-large" \| "unreadable" \| "metadata" }` を返し、テストも種類で確かめる |
| 3 | 今回は直さない。PR の本文の弱点候補に書いた（canvas の出力には出ない。Worker 側の検査と合わせて考える） |
| 4 | 今回は直さない（送らない側に倒れる）。弱点候補に書いた |
| 5 | 対応した。APP15・長さ<2・SOS なしのテストを足した |
| 6 | 対応した。委員向けに「写真の情報を消しきれなかったので、送りませんでした」などに言い換えた |
| 7 | 対応した。PR の本文に3つの欄を足し、spec §4（APP2 を取り除く）・§8（Service の名前）を直した |
| 8 | 今回は直さない（動きに影響しない）。弱点候補に書いた |
