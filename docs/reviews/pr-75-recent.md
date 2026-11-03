# レビュー: PR #75 T21 GET /api/photos/recent と画像の配信

## 対象
- PR: https://github.com/akutodazo/ear-to-ear/pull/75 （`feat/recent` → `main`）
- 差分の基準: `git diff origin/main...origin/feat/recent`（13 ファイル）。レビューした先頭は `e7a8ec5`

## レビューした者
書いた会話を見ていない別の Claude Code のセッション（Claude Opus 5.5、`claude-opus-5-5`）。受け取ったのは PR の番号と「AGENTS.md と docs/spec.md を読んでから見る」という指示だけ。

## 読んだもの
- `AGENTS.md`、`docs/spec.md`（§4 の閲覧、§5 の D1 の表と R2 のキー、§6 の API の表、§7 の `/recent`、§9 の合格条件 1〜3）、`docs/privacy.md`
- 差分の実装の全部: `src/services/photo-query.ts`、`worker/photos.ts`・`photo-files.ts`・`routes.ts`、`src/config.ts` の 2 つの定数
- 差分の外で関わるもの: `worker/router.ts`（`:id` は復号しない・`/` を含まない）、`worker/app.ts`（認証の判定とハンドラの呼び方）、`worker/http.ts`（`json()` と共通ヘッダの `no-store`・`nosniff`）、`src/services/upload-form.ts` の `r2KeyFor`、`worker/uploads.ts` の id の作り方（`deps.newId()`）、`src/types/index.ts` の `UploadedPhoto`
- テスト: `worker/photos.test.ts`・`photo-files.test.ts` の例の一覧、`app.test.ts` の付け替え、`photo-query.test.ts` の列名の検査（座標・距離らしい名前が無いこと）
- `docs/run/TASKS.md` の T21、`docs/run/REPORT-T21.md`（手元のパス・利用者名が無いこと）
- PR の本文（本人に確認したいこと 1〜3、弱点候補 1〜5）
- 差分の全体で、秘密の名前、手元のパス、座標・距離らしい名前と値、引数なしの `toThrow()` を探した。見つかったのは、列名に `lat`・`dist` などが無いことを確かめるテストの正規表現と、無視されるクエリ `lat=41.8`（`FICTIONAL_AREA` の端の中）だけ

## 手元で確かめたこと
PR のブランチ（`e7a8ec5`）で `npm ci` → `npm run check`。

`npm ci` は **終了コード 0**（手元の Node は v25。CI は Node 24。`npm audit` の案内が出るのは前から）。`npm run check` は **終了コード 0**。

```
check:safety: 194 ファイルを確認
check:safety: OK（名前・デモの JPEG・圃場の座標・秘密らしい文字列）
  25:18  warning  '_removed' is assigned a value but never used  @typescript-eslint/no-unused-vars
  10:1  warning  Assign object to a variable before exporting as module default  import/no-anonymous-default-export
✖ 2 problems (0 errors, 2 warnings)
 Test Files  50 passed (50)
      Tests  1187 passed (1187)
✓ Compiled successfully in 2.7s
✓ Generating static pages using 8 workers (7/7) in 942ms
check exit 0
```
lint の警告 2 つは前からあるもの。テストの数 1187 件は PR 本文の数と一致する。テストの途中に出る `LF will be replaced by CRLF` の警告は、檻のテストが一時のリポジトリを作るときのもので、このリポジトリのファイルではない。終わった後の `git status` は空。

`wrangler dev` での確認は PR 本文と TASKS の記録を読んだだけで、手元では動かしていない。

## 結論
**マージを止める問題は無い**。ただし、`docs/privacy.md` を変える（端末 ID を合言葉なしで出す）ので、**本人の承認が出るまでマージしない**（PR 本文の確認 1。指摘 1）。共有ファイル `src/config.ts` を変えるので、AGENTS.md §2 の「両方の承認」も要る。

- 撮影位置（K6）: 新しい漏れは無い。返す 11 列は `PHOTO_LIST_COLUMNS` の許可リストで、SQL も `*` を使わない。D1 にそもそも座標・距離の列が無い（T11）。画像は R2 に置いたバイト列をそのまま返すだけで、APP1〜15 を足す経路は無い（APP1〜15 を隠した画像が受け口を通る件は PR #64 のレビューの指摘 1 で、この PR では変わらない）
- 秘密・照合に使える値: 写真のハッシュ（`content_hash`）と R2 のキーは返さない。テストが本文の文字列まで見ている。端末 ID は Cookie の中身の一部だが、Cookie は `SESSION_SECRET` の HMAC で署名されるので、端末 ID を知っても Cookie は作れない
- 画像の配信: `:id` は `/` を含まず復号もしないので、キーはいつも `uploads/<…>.jpg` の形。R2 のキーは平らな文字列で `..` に意味は無く、`..` は URL の正規化で経路に当たらない（テストあり）。ほかの接頭辞のオブジェクトは読めない
- spec §6 の表（`GET /api/photos/recent` は 200 のみ、`GET /api/photo-files/:id` は 200／404、どちらも認証なし）と合う。一覧は共通ヘッダで `no-store`、画像は `private, max-age=86400` と `nosniff`

## 指摘
| # | 重さ | 内容 | 勧める対応 |
|---|---|---|---|
| 1 | 中 | **端末 ID を合言葉なしで誰でも読める**（privacy.md の変更）。今の画面（`src/`）は `uploaderDevice` をどこでも使っていない（型にあるだけ）。名前は分からないが、同じ端末が送った写真をまとめてたどれ、送った時刻と合わせると「誰がいつどの畑に行ったか」の手がかりになる。データは架空（K10）なので今の害は無いが、本番で実在の圃場に使うときに効く。管理者の端末が送った写真から、管理者の端末 ID も分かる（Cookie は作れないので権限には効かない） | 本人が承認するまでマージしない。画面が使わないなら、返さないほうが筋がよい（列の一覧から `uploader_device` を外し、型の `uploaderDevice` を任意にするか、一覧用の型を分ける。型は共有ファイルなので両方の承認）。返すなら privacy.md の今の書き方で足りる |
| 2 | 低 | **委員が選んだ番号（`chosenFieldId`）を合言葉なしで返す**。spec §7 は「委員が選んだ番号は出さない」（画面の話）で、API の本文には載る。位置ではなく番号なので K6 には当たらない | PR 本文の確認 3 のとおり本人に確かめる。返すなら spec §7 に「画面には出さないが API の本文にはある」と 1 行足す |
| 3 | 低 | **`:id` の形を検査しない**（TASKS の決定どおり）。任意の文字列で R2 を 1 回読む。害は無い（指摘の外）が、`newId()` の UUID の形（`/^[0-9a-f-]{36}$/` など）でなければ R2 を読まずに 404 にすれば、読む回数とログが減る | L0 では対応不要。直すなら Service に `isPhotoId` を置き、テストを人が足す |
| 4 | 軽微 | 一覧の並び `ORDER BY uploaded_at DESC, id DESC` は、索引 `idx_photos_uploaded(uploaded_at)` だけでは同じ時刻の並びまで索引で済まない（推定。SQLite が並べ替えを足すことがある）。L0 の件数では問題にならない。認証なしなので、繰り返し呼ばれると D1 の読み取りの行数が 200 行ずつ増える | 対応不要。件数が増えたら索引を `(uploaded_at, id)` にするか考える |
| 5 | 軽微 | 画像は R2 の Content-Type を見ず、いつも `image/jpeg`（弱点候補 2）。受け口が JPEG だけを受け、`nosniff` も付くので害は無い | 対応不要 |
| 6 | 軽微 | 画像の `private, max-age=86400` は、写真を消す・差し替える機能を作ったときに端末に 1 日残る（弱点候補 3）。id は毎回新しい UUID なので差し替えでは起きない | 消す機能を作るときに見直す |

## 決まりとの照合
| 決まり | 結果 | 根拠 |
|---|---|---|
| K6 撮影位置を端末の外に出さない | 守れている | 返す列は 11 列の許可リストで、座標・距離の列は D1 に無い。テストが列名に `lat`・`dist`・`gps` などが無いこと、余計なクエリ（`lat=`）を無視することを見る |
| 公開側の画像に APP1〜15 を残さない（§1-4） | この PR では変わらない | 配信は保存したバイト列をそのまま返す。受け口の限界は PR #64 のレビューの指摘 1 |
| 秘密を入れない・漏らさない | 守れている | 差分に秘密の値は無い。`check:safety` も OK。ハッシュ・R2 のキーは返さない。500 で中身を漏らさないテストあり |
| 公開範囲（privacy.md） | 本人の承認待ち | 端末 ID を一覧で出す（指摘 1） |
| 実データを入れない | 守れている | 画像ファイルの追加は無い。圃場は `A-01` 形式 |
| テストの座標（§1-6） | 守れている | `lat=41.8` は `FICTIONAL_AREA` の端の中 |
| spec §6 の表 | 合っている | recent は 200（limit は 400 にせず既定・上限に丸める）、photo-files は 200／404、どちらも認証なし（壊れた Cookie でも 401 にならない） |
| 層の決まり（ハンドラは薄く、判定は Service） | 合っている | limit の解釈と行の写しは `photo-query.ts`（純粋関数）、ハンドラは SQL 1 文と R2 の 1 回だけ |
| 定数は config に 1 回だけ | 合っている | `RECENT_LIMIT_DEFAULT`・`RECENT_LIMIT_MAX` は `src/config.ts`、キャッシュの値はハンドラの定数（テストが参照） |
| import は `@/`（11-03） | 合っている | `photo-query.ts` は `@/config`・`@/types`、worker は `@/services/...`・`./...` |
| RED と GREEN は別のコミット | 守れている | RED は人のコミット、GREEN `2833e43` は無人運転のコミット。人の確認でテストを 1 つ直したコミット（`10b5714`）も別 |
| 例外のテストに引数なしの `toThrow()` を使わない | 守れている | 差分に引数なしの `toThrow()` は無い |
| 担当のフォルダ（§2） | 共有ファイルあり | 先輩の範囲（`worker/`、サーバー側の Service）に加え、共有の `src/config.ts` を変える。本人の承認が要る（PR 本文の確認 2） |
| 無人運転（§5） | 守れている | 無人で変えたのは許可した 3 ファイルと `REPORT-T21.md` だけ、C1〜C5 合格、QUESTIONS なし。REPORT はパケットごとで、手元のパス・利用者名は無い |
| 手元のパスを残さない | 守れている | 差分に利用者名を含むパスは無い |
| 自動マージ | 付けていない（正しい） | 無人運転・共有ファイル・別のセッションのレビューが要る PR |

## 「止める」の指摘
なし。指摘 1 は「中」で、マージの前に本人が privacy.md の変更（端末 ID を出すか）を承認するか、返さない形に変えるかを決める。
