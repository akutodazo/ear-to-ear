# PR #51 のレビュー（写真の情報を /upload につなぐ）

## 対象
- PR: akutodazo/ear-to-ear#51「写真の情報を /upload につなぐ（T01 の readPhotoMeta、送る meta に座標が入らないテスト）」
- ブランチ: `feat/upload-photo-meta` → `main`
- コミット: `d469cf0`（RED）、`4bdbfa8`（GREEN）
- 変わったファイル: `src/lib/upload-steps.ts`、`src/lib/upload-steps.test.ts`（新規）、`src/lib/resize-jpeg.ts`

## レビューした者
書いた会話を見ていない別の Claude Code のセッション（モデル: Claude Opus 5.5、`claude-opus-5-5`）。2026-11-03。渡されたのは PR の番号と読み方だけ。

## 読んだもの
- `AGENTS.md`、`docs/spec.md`
- `git diff origin/main...feat/upload-photo-meta`、`git log origin/main..feat/upload-photo-meta`、各コミットのメッセージ
- 関係する既存のファイル: `src/services/photo-meta.ts`、`src/hooks/use-upload.ts`、`src/services/upload-request.ts`、`src/repositories/implementations/http-photo-repository.ts`（upload の部分）、`src/data/fields.json`、`vitest.config.ts`、`tsconfig.json`
- PR の本文（ブラウザで https://github.com/akutodazo/ear-to-ear/pull/51 ）

## 結論
**マージを止める問題は無い。** 撮影位置は端末の中の候補の計算にだけ使われ、送る meta と送る画像には入らない（K6）。写真の先頭だけを読むことの端（APP1 が先頭の外にある・境目をまたぐ）でも、例外を出さずに「位置なし・日付不明」になることを確かめた。ただし「先頭だけを読む」テストは、写真を丸ごと読む書き方に変えても通ってしまい、誤りを捕まえられない（#1）。

## 指摘
| # | 重さ | 内容 | 勧める対応 |
|---|---|---|---|
| 1 | 中 | テスト「写真の先頭だけを読む（後ろに大きな画像データが続いても同じ結果）」は、先頭だけを読んでいることを確かめていない。`readPhotoInfo` を `file.arrayBuffer()`（丸ごと読む）に変えても 4 件とも通った。`PHOTO_INFO_HEAD_BYTES >= 256KB` も定数を見ているだけ | `vi.spyOn(file, "slice")` で `(0, PHOTO_INFO_HEAD_BYTES)` で呼ばれたことを確かめる。または、APP1 を先頭の外（例: 64KB の APP2 を 8 個並べた後）に置いた写真で `position` が null になることを確かめる（どちらも下の「確かめたこと」で動くことを確認済み） |
| 2 | 低 | 先頭の境目の端がテストに無い。今の動き（先頭の外の APP1 は読まない、境目をまたぐ APP1 は途中まで読まずに止まる、例外なし）は安全だが、将来 `readPhotoMeta` が「途中で切れた APP1 も読む」に変わったときに気づけない | 境目をまたぐ XMP で「位置なし・日付不明・例外なし」になるテストを1件足す。PR 本文の弱点候補1（512KB より後ろの APP1 は読めない）をテストの名前でも残す |
| 3 | 低 | K6 の新しいテスト（4件目）は `buildUploadMeta` に座標を渡していないので、結果に座標が無いのはほぼ当然。座標・距離が紛れたときに落とすことは既存の `upload-request.test.ts` が確かめている。`use-upload` の `sendOne` → `repo.upload`（FormData）の経路を通したテストは無く、PR 本文の画面での確認（fetch の横取り）だけ | 後続の PR でよい: `sendOne` の meta の組み立てを関数に切り出すか、偽の repository を渡して、`upload` に渡った meta に座標・距離が無いことを確かめる |
| 4 | 軽微 | import の書き方が混ざった。`src/lib` は相対、`src/hooks`・`src/components`・一部の `src/services` は `@/` のまま。理由（vitest は値の import の `@/` を解決しない）は確かめた（下）。Next.js のビルドへの影響は確かめていない（`npm run build` は回していない。PR 本文では `npm run check` 成功） | 方針を1つにする。`vitest.config.ts` に `resolve.alias` を足して `@/` に揃えるか、「Service・lib は相対で書く」を AGENTS.md §4 に書く。どちらにするかは本人が決める（AGENTS.md は共有ファイル） |
| 5 | 軽微 | import の書き換え（関心事が別）が RED のコミットに入っている。コミットのメッセージに理由は書かれている | 対応しなくてよい。次からは書き換えだけのコミットを RED の前に分ける |
| 6 | 軽微 | `PHOTO_INFO_HEAD_BYTES` のコメント「1つ 64KB までなので、512KB あれば足りる」は言い切り。APP の個数に上限は無いので、足りるのは普通の写真での見込み | 「普通の写真では足りる（推定）。足りないときは位置なし・日付不明になる」と書く（AGENTS.md §4「推定は推定と書く」） |
| 7 | 軽微 | PR 本文の AT-1 の距離（A-06 約40m）は、テストの座標（41.8075, 144.5076。A-06 まで約8m）とは別の写真のもの。食い違いではないが、読み手が迷う | 本文に「画面の確認はテストと別の架空の座標の写真」と書き添える |

## 決まりとの照合
| 決まり | 結果 | 根拠 |
|---|---|---|
| K6・§1-4 撮影位置・距離を端末の外に出さない | 適合 | `readPhotoInfo` の `position` は `use-upload.ts` の `candidatesFor` だけで使う。`sendOne` は `buildUploadMeta`（5項目を1つずつ書き出す）で meta を作り、`http-photo-repository.ts` の FormData は `image`（縮小・再エンコード後、名前は `photo.jpg` 固定）と `meta` だけ。`src/components`・`hooks`・`lib`・`app`・`repositories` に console・localStorage・sessionStorage・indexedDB への書き出しは無い（grep） |
| §1-2 実データを入れない | 適合 | テストの座標（41.8075, 144.5076）は架空の範囲（北緯 41.800〜41.815、東経 144.500〜144.520）の中 |
| §1-5 画像はコミットしない（テストではバイト列を組み立てる） | 適合 | 変わったのは .ts の3つだけ（`git diff --stat`）。テストの JPEG はテストの中で組み立てている |
| §1-3・§1-6 秘密 | 該当なし | 差分に秘密の名前・値は無い |
| §2 担当のフォルダ | 適合 | `src/lib` だけ（本人の範囲）。共有ファイル（`src/types/`・`src/config.ts`・`AGENTS.md`・`package.json`）は変えていない |
| §3 RED と GREEN を別のコミット | 適合（#5 は軽微） | RED の時点で 3 件失敗・1 件成功（JPEG でない場合は仮の実装でも通る）を確かめた。PR 本文の記録と一致 |
| §3 引数なしの `toThrow()` を使わない | 該当なし | 例外のテストは無い |
| §3 PR の本文の項目 | 適合 | 影響範囲・ライブラリ・文書・弱点候補3つ・検証ログがある |
| §4 層 | 適合 | `src/lib`（ブラウザ専用。`File.slice`）が Service の `readPhotoMeta`（バイト列を受ける純粋関数）を呼ぶ。Service はブラウザ API に依存していない |
| §4 命名・`any`・`@ts-ignore`・`eslint-disable` | 適合 | 差分に無い。ファイル名は kebab-case |
| spec §4 の 3「XMP/EXIF から位置・日時を読む（位置は送らない）」 | 適合 | 上の K6 と同じ |

## 確かめたこと
リポジトリの外の一時フォルダに `git archive` で各コミットを書き出し、`node_modules` はリンクで借りて実行した（リポジトリのファイルは作っていない・変えていない。最後に `git status --porcelain --untracked-files=all` が空）。

1. RED の時点（`d469cf0`）: `npx vitest run src/lib/upload-steps.test.ts` → **3 件失敗・1 件成功**（失敗は「DJI の XMP から…」「先頭だけを読む…」「送る meta は番号だけ…」）
2. GREEN の時点（`4bdbfa8`）: 同じテスト → **4 件成功**
3. GREEN の時点の全体: `npx vitest run` → **23 ファイル・626 件成功**。`npx tsc --noEmit` → エラーなし。`npx eslint src/lib` → エラーなし
4. 先頭の端（一時フォルダに置いた試しのテスト、`PHOTO_INFO_HEAD_BYTES` = 524288）:
   - 64KB の APP2 を 7 個並べた後（XMP の始まり 458761 バイト目）→ 位置を読める
   - 8 個並べた後（524298 バイト目、先頭の外）→ `{ position: null, takenAt: null, takenAtSource: "none" }`、例外なし
   - XMP が境目をまたぐ（524281〜524435 バイト目）→ 同じく位置なし・日付不明、例外なし
   - `vi.spyOn(file, "slice")` → `slice(0, 524288)` で1回呼ばれる
5. テストが誤りを捕まえるか: `readPhotoInfo` を `new Uint8Array(await file.arrayBuffer())`（丸ごと読む）に変えても、PR のテストは **4 件とも成功**（#1）
6. import の書き換えの理由: `upload-steps.ts` の `../config` を `@/config` に戻すと、vitest は `Cannot find package '@/config'` で読み込みに失敗する
7. 距離: A-06（41.8075, 144.5075）とテストの座標（41.8075, 144.5076）は経度 0.0001° の差で約8m（計算のみ）

### 確かめていないこと
- `npm run check`・`npm run build`・`next dev`（リポジトリの中にファイルを作るので回していない）。`npm run check:safety` も回していない
- GitHub の CI（`check`）の成否（ページから読み取れなかった）
- PR 本文の AT-1・AT-2（画面での確認）の再現
- 実機の写真（DJI・Android・iPhone）での APP の並びと大きさ

## 指摘への対応（書いた側、11-03）
| # | 対応 |
|---|---|
| 1 | 対応した。先頭（`PHOTO_INFO_HEAD_BYTES`）を越える APP2 の後ろに位置つきの XMP を置いた写真で、位置なし・日付不明になるテストを足した。`file.arrayBuffer()`（丸ごと読む）に変えると落ちることを確かめた |
| 2 | 対応した。境目をまたぐ XMP で、例外を出さずに位置なし・日付不明になるテストを足した（テストの名前にも「512KB より後ろは読めない弱点」と書いた）。丸ごと読む書き方では落ちる |
| 3 | 後続の PR にする（`sendOne` の meta の組み立てか、偽の repository で `upload` に渡った meta を確かめる） |
| 4 | 後続で本人が決める（`vitest.config.ts` に別名を足して `@/` にそろえるか、「Service・lib は相対で書く」を AGENTS.md に書くか。どちらも共有・凍結のファイル） |
| 5 | 次からは書き換えだけのコミットを RED の前に分ける |
| 6 | 対応した。コメントを「普通の写真では足りる見込み（推定）。足りないときは位置なし・日付不明」にした |
| 7 | PR の本文に「画面の確認はテストと別の架空の座標の写真」と書き添えた |
