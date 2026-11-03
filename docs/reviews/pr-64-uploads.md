# レビュー: PR #64 T20 POST /api/uploads

## 対象
- PR: https://github.com/akutodazo/ear-to-ear/pull/64 （`feat/uploads` → `main`）
- 差分の基準: `git diff origin/main...origin/feat/uploads`（19 ファイル）。レビューした先頭は `6975424`

## レビューした者
書いた会話を見ていない別の Claude Code のセッション（Claude Opus 5.5、`claude-opus-5-5`）。受け取ったのは PR の番号と「AGENTS.md と docs/spec.md を読んでから見る」という指示だけ。

## 読んだもの
- `AGENTS.md`、`docs/spec.md`（§4 の送る流れの 4〜6、§5 の公開範囲、§6 の D1 の表・API の表・meta の決まり、受け入れの 2・5、テストの表の「保存の失敗」）
- 差分の実装の全部: `src/services/upload-form.ts`、`worker/uploads.ts`・`body.ts`・`session.ts`・`routes.ts`・`http.ts`・`deps.ts`・`env.ts`、`worker/test-bucket.ts`・`test-helpers.ts`
- 差分の外で関わるもの: `src/services/jpeg-segments.ts`（`inspectJpeg`）、`migrations/` の `uploaded_photos`（`content_hash` が `UNIQUE`）、`worker/app.ts`・`index.ts` の 500 の扱い、`src/config.ts` の `MAX_UPLOAD_BYTES`・`THUMBNAIL_LONG_EDGE_PX`・`FICTIONAL_AREA`
- テスト: `worker/uploads.test.ts` の準備の部分と、撮影位置・メタデータ・保存の失敗の例。`worker/test-helpers.ts` の `tinyJpeg`・`multipartBody`
- PR の本文（弱点候補 1〜5、本人に確認したいこと 1〜3）
- 差分の全体で、秘密の名前、手元のパス（`C:\Users\…`）、座標・距離らしい名前、引数なしの `toThrow()` を探した。見つかったのは `env.ts` の既存の `requireSecret` の行（値は無い）と、テストで拒否されることを確かめる欄 `lat`・`distance`（値 `41.8` は `FICTIONAL_AREA` の端の中）だけ。`REPORT-T20.md` に手元のパスは無い

## 手元で確かめたこと
PR のブランチ（`6975424`）で `npm ci` → `npm run check`。

`npm ci` は **終了コード 0**（手元の Node は v25.9.0。CI は Node 24）。`npm run check` は **終了コード 0**。

```
check:safety: 182 ファイルを確認
check:safety: OK（名前・デモの JPEG・圃場の座標・秘密らしい文字列）
  25:18  warning  '_removed' is assigned a value but never used  @typescript-eslint/no-unused-vars
  10:1  warning  Assign object to a variable before exporting as module default  import/no-anonymous-default-export
✖ 2 problems (0 errors, 2 warnings)
 Test Files  46 passed (46)
      Tests  1106 passed (1106)
✓ Compiled successfully in 2.5s
✓ Generating static pages using 8 workers (7/7) in 931ms
check exit 0
```
lint の警告 2 つは前からあるもの（`upload-meta.test.ts` と `worker/index.ts`）。テストの数 1106 件は PR 本文の数と一致する。終わった後の `git status` は空。

**メタデータを隠した JPEG の確かめ（使い捨て。コミットしていない）**: `worker/` に一時のテストを置き、テストの部品（`tinyJpeg`・`createTestDb`・`createTestBucket`）で次の 2 つを `POST /api/uploads` に送った。
1. SOS（画像データ）の後ろに APP1（`Exif\0`）を置き、もう一度 SOS を置いてから `FF D9` で終わる JPEG
2. `FF D9` の後ろに APP1 を足し、最後をもう一度 `FF D9` で終える JPEG

**どちらも 201 で保存された**。確かめた後にファイルは消した（`git status` は空）。

`wrangler dev` での確認は PR 本文の記録を読んだだけで、手元では動かしていない。

## 結論
**マージを止める問題は無い**。

- 撮影位置（K6）: 経路は守れている。multipart の欄は `image` と `meta` のちょうど 2 つで、ほかの欄（`lat` など）は 422。meta は `parseUploadMeta` の 5 項目の許可リストで、`lat`・`distance` は 422 `unknown_key`。D1 の行は 15 列で、座標・距離の列は無い（テストが列名まで見る）。Worker が `fields.json` から取るのは番号だけ
- メタデータ（APP1〜15）: 送る側の正しい経路（再エンコード → `prepared-photo.ts` で取り除く）で作られた JPEG は、Worker の検査で確かめられる。ただし **わざと隠した APP1 は通る**（指摘 1）。PR の弱点候補 2 は COM と EOI の後ろを挙げているが、「2 枚目の SOS の前」も同じく見ていない
- spec §4 の 5〜6 の順（Cookie → APP1〜15 → ハッシュで二重を見て 409 → R2 → D1 → 201）と合う。同時の二重は `ON CONFLICT(content_hash) DO NOTHING RETURNING id` の結果で見分け、置いた画像を消して 409。ほかの D1 の失敗は画像を消して投げ、`app.ts` が 500 にする。spec の「UNIQUE 違反で 409」とは書き方が違うが、動きは同じで、エラー文に頼らない分よい
- 本文は 3MB＋16KB で読むのをやめる（content-length が無い・偽りでも）。画像の検査はセグメントの見出しをたどるだけで、デコードしない
- 秘密: 差分に値は無い。R2 の片付けの失敗で残すのはキーだけ

## 指摘
| # | 重さ | 内容 | 勧める対応 |
|---|---|---|---|
| 1 | 中 | **わざと隠した APP1〜15 は Worker の検査を通る**。`inspectJpeg` は最初の SOS で止まり、`checkUploadImage` は末尾の `FF D9` しか見ないので、(a) 2 枚目の SOS の前の APP1（JPEG の決まりではスキャンの前に APPn を置ける）、(b) EOI の後ろに足して最後を `FF D9` で終えたもの、のどちらも 201 で保存され、R2 から配信される（手元で確かめた）。spec の受け入れ 2「公開側の画像に APP1〜15 が無い」と §5「Worker でも検査する」は、送る側が正しいときにしか成り立たない。正しいブラウザの経路（canvas の再エンコードは 1 スキャン）では起きない見込み（推定）で、隠せるのは合言葉を持つ委員だけ | L0 では止めない。PR 本文の弱点候補 2 を「SOS より後ろ（2 枚目のスキャンの前・EOI の後ろ）に置いた APP1〜15 は見ない。合言葉を持つ委員がわざと隠せば通る」と書き直し、spec §5 にも同じ限界を 1 行書く。直すなら、最初の SOS の後ろを `FF` を探して進み、`FF E1`〜`FF EF`（スキャンの中では `FF 00` に置き換わるので誤検出しない）があれば 422 `metadata`、最初の EOI より後ろにバイトがあれば 422 `not_jpeg`。3MB を 1 回なめる分の CPU は dev で測ってから決める |
| 2 | 低 | **CPU 10ms に収まるかは未確認**（PR の弱点候補 1 と同じ）。`formData()` で 3MB の multipart を分け、`arrayBuffer()` で写しを作る。見積もり 3〜6ms は推定 | PR 本文のとおり、dev にデプロイした後に Workers の CPU time で確かめ、Issue に数を残す。超えるなら指摘 1 の全体の走査は入れない |
| 3 | 低 | **`meta` の JSON が壊れていても、画像を先に検査する**。順は「欄 → 画像 → meta」なので、画像に APP1 があり meta に `lat` もある要求は 422 `metadata` で返り、`unknown_key` は返らない。どちらも保存しないので害は無い | 対応不要。理由のコードを画面で出し分けるなら、この順をテストが固めていることを本人側（画面）に伝える |
| 4 | 軽微 | 壊れた multipart（`formData()` が投げる）を 415 で返す。Content-Type は正しいので、意味としては 400 か 422 `bad_form` が近い | spec §6 の表の失敗の一覧に 400 が無いので、415 のままでもよい。変えるなら 422 `bad_form` |
| 5 | 軽微 | R2 の片付け（`delete`）に失敗すると孤立した画像が残り、記録は `console.error` のキーだけ | L0 では対応不要。後で R2 のキーと D1 の `r2_key` を突き合わせる掃除を足すなら、そのときに |
| 6 | 軽微 | Worker が `src/data/fields.json` を import するので、架空の圃場の座標も Worker の束に入る（使うのは番号だけ）。架空のデータで、静的サイトでも公開されるので害は無い | PR 本文の「確認したいこと 1」のとおり本人に確かめる。気になれば番号だけの一覧を別に作る |

## 決まりとの照合
| 決まり | 結果 | 根拠 |
|---|---|---|
| K6 撮影位置を端末の外に出さない | 守れている | 欄は `image`・`meta` だけ、meta は 5 項目の許可リスト、D1 の列に座標・距離は無い。テストが `lat`・`distance` の欄・項目で 422 と、R2・D1 に何も残らないことを見る |
| 公開側の画像に APP1〜15 を残さない（§1-4、spec §5） | 一部に懸念 | SOS より前は検査する。SOS より後ろに隠したものは通る（指摘 1） |
| 秘密を入れない・漏らさない | 守れている | 差分に秘密の値は無い。`check:safety` も OK |
| 実データを入れない | 守れている | 画像ファイルの追加は無い（JPEG はテストの中で組む）。圃場は `A-01` 形式の架空の番号 |
| テストの座標（§1-6） | 守れている | テストの `lat` の値 `41.8` は `FICTIONAL_AREA` の端の中 |
| spec §4 の 5〜6・§6 の表 `POST /api/uploads` | 合っている | 201 `{id}`／401／409 `{id}`／413／415／422。同時の二重は画像を消して 409、ほかの失敗は画像を消して 500 |
| spec §6 meta の決まり | 合っている | `parseUploadMeta`（T04）をそのまま使い、既知の番号は `fields.json` から。`chosenFieldId` があっても `state` は `unconfirmed`、`field_id` は null |
| CPU 10ms（spec・AGENTS.md §4） | 未確認 | 指摘 2 |
| 層の決まり（ハンドラは薄く、判定は Service） | 合っている | 判定は `upload-form.ts`（純粋関数。検査の関数は注入）、ハンドラは順につなぐだけ。ストリームを読む `body.ts` は Worker 側で妥当 |
| RED と GREEN は別のコミット | 守れている | RED は人のコミット、GREEN `e7bd388` は無人運転のコミット |
| 例外のテストに引数なしの `toThrow()` を使わない | 守れている | 差分に引数なしの `toThrow()` は無い |
| 担当のフォルダ（§2） | 守れている | 先輩の範囲（`worker/`、サーバー側の Service）。共有の `src/types/`・`src/config.ts`・`package.json` は変えていない。`fields.json` の import は本人の確認待ち（指摘 6） |
| 無人運転（§5） | 守れている | PR 本文と `REPORT-T20.md` では、無人で変えたのは許可した 2 ファイルだけ、C1〜C5 合格、QUESTIONS なし。REPORT はパケットごと |
| 手元のパスを残さない | 守れている | 差分に利用者名を含むパスは無い |
| 自動マージ | 付けていない（正しい） | 無人運転・別のセッションのレビューが要る PR |

## 「止める」の指摘
なし。指摘 1 は「中」で、弱点として書き直して L0 の後に直すか、今直すかを先輩と本人が決める。
