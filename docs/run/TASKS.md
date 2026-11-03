# パケットの一覧（無人運転用）

無人運転（本人・先輩どちらも。`/goal` か MCP の檻、AGENTS.md §5）に渡す作業単位。
**REPORT は 11-03 からパケットごと**（`docs/run/REPORT-Txx.md`）。取り込み済みの T01・T02・T04・T18・T19 の分は分けて置いた。下の項目の中の `docs/run/REPORT.md` は運転したときの名前。運転はパケットの番号で呼ぶ（「T01 の運転」）。
状態は人が書き換える: 予定 → RED済み（人） → 運転中 → 検査済み・人の確認待ち → 取り込み済み／止まった。
START ハッシュはここに書かない（`/goal` と運転記録だけ）。

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

## T00 初期化
- **状態**: 取り込み済み（11-02、人）
- **内容**: Next.js 16（App Router・TypeScript・`output: 'export'`）、Vitest、Leaflet、wrangler、`npm run check`（安全検査 → lint → 型 → テスト → build）、`.gitignore`、AGENTS.md・CLAUDE.md・`.claude/settings.json`、docs、CI
- **合格条件**: main で `npm run check` が通る

## T02 `src/services/candidates.ts`（候補の圃場を近い順に出す）
- **状態**: 取り込み済み（11-03、PR #38 のマージで。人の確認と別のセッションのレビューは済み）
- **次への申し送り（PR #38 のレビュー）**: `LatLng` は `candidates.ts` の中にある。T01 で撮影位置の型が要るときに `src/types/` へ移すかを決める（共有ファイル）。NaN の座標は T01 で null にする前提なので、T01 の RED に「0/0（NaN）は null」のテストがあることを確かめる
- **運転の記録（試験1、11-03）**: ブランチ `run/1103-a`、START `eed9b9f` → GREEN `ecb262b` → REPORT `7583d66`。モデル Opus・自動モード・`/goal`。C1〜C5 はすべて合格（人も HEAD で C1・C3・C4・C5 を回し直して合格）。ずれ: C2〜C4 を1回のメッセージで続けて出した、C4 に `; echo` をつないだ（REPORT に自己申告あり。人が単独で回し直して終了コード 0 を確認）
- **依存**: T00
- **変えてよいファイル**: `src/services/candidates.ts` のみ（＋ `docs/run/REPORT.md`、止まったときは `docs/run/QUESTIONS.md`）
- **テスト（凍結）**: `src/services/candidates.test.ts`。**13 件**（`candidateFieldIds` 9・`distanceMeters` 4）。距離が同じなら番号の昇順。地球の半径は 6,371km
- **関数**: `candidateFieldIds(position: LatLng | null, fields: readonly Field[], max = MAX_CANDIDATES): string[]`、`distanceMeters(from: LatLng, to: LatLng): number`（`LatLng` は candidates.ts の中で定義済み）
- **RED で人が足すもの**: `src/types/`（`Field` は T00 で済み）、`src/config.ts` の `MAX_CANDIDATES`（T00 で済み）、空の実装 `throw new Error('not implemented')`、このパケット項目の件数
- **合格条件（テストにする）**:
  - 撮影位置（lat, lng）と圃場一覧から、近い順に圃場の **番号だけ** を返す（距離は返さない。K6）
  - 最大 N 件（既定 `MAX_CANDIDATES` = 3）
  - 位置が null なら空配列
  - 画面用の距離は別の関数で出す（この関数の戻り値には含めない）
  - 距離はハバーサイン（地球の半径は定数として `src/config.ts` に置かず、Service 内の定数でよい）
- **参照**: docs/spec.md「流れ（L0）」3、「データ契約」`Field`・`UploadedPhoto.candidateFieldIds`

## T04 `src/services/upload-meta.ts`（`POST /api/uploads` の meta の検証）
- **状態**: 検査済み・人の確認待ち（11-03）
- **運転の記録（試験2、MCP の檻）**: START `19bafb5` → GREEN `955943a` → REPORT `af5e2f3`。モデル Opus 5.5、`claude -p`、道具は檻の5つだけ、12手、$0.51。変更は `upload-meta.ts` だけ
- **止まった理由**: C4 の build が `next` を見つけられず不合格で、QUESTIONS を書いて止まった（決まりどおり）。原因は人の準備で、使い捨ての worktree の `node_modules` を Windows のリンク（junction）にしたため。Turbopack はリンクの外を読めない。本体のチェックアウトで C1・C3・C4・C5 を回し直して合格（テスト全体 438 件）。T04 の REPORT（C4 は当時の不合格のまま）は git の履歴の `af5e2f3` に残っている（今の `docs/run/REPORT.md` は T01 のもので上書きされた。PR #50 のレビュー #6）。QUESTIONS はコミットしていない
- **次の運転への申し送り**: worktree では `npm ci` するか、C4 を人の確認に回す
- **依存**: T02（取り込み済み）
- **変えてよいファイル**: `src/services/upload-meta.ts` のみ（＋ `docs/run/REPORT.md`、止まったときは `docs/run/QUESTIONS.md`）
- **テスト（凍結）**: `src/services/upload-meta.test.ts`
- **RED で人が足したもの**: `src/types/index.ts` の `UploadMeta`、`src/services/upload-meta.ts` の型・`UPLOAD_META_MAX_CHARS`・空の実装
- **関数**: `parseUploadMeta(text: string, knownFieldIds: ReadonlySet<string>): UploadMetaResult`。例外を出さない
- **理由のコード**（テストで凍結）: `too_long` `not_json` `not_object` `unknown_key` `missing_key` `bad_content_hash` `bad_taken_at` `bad_taken_at_source` `taken_at_mismatch` `bad_candidates` `too_many_candidates` `duplicate_candidate` `unknown_field` `bad_chosen_field`。検査はこの順で、最初に当たった理由を返す
- **合格条件**:
  - JSON.parse の前に長さを見る
  - 最上位のキーは5つの許可リストだけ（K6）。`in` を使わず `Object.keys` で見る（`"constructor" in obj` は true になる）
  - `contentHash` は16進64桁。大文字は受け付け、小文字に直して返す（11-03 先輩決定）
  - `takenAt` は null か実在する `YYYY-MM-DD`。実在は `Date.UTC` の往復で確かめる（`new Date("2026-02-30")` は環境で揺れる）
  - `none` なら `takenAt` は null、`xmp`・`exif` なら日付（11-03 先輩決定）
  - 候補は文字列の配列で、空も可。`MAX_CANDIDATES` 以下、重複なし、全部既知。順は入力のまま
  - `chosenFieldId` は省略か null なら null。文字列なら既知の番号。候補に無くてもよい（11-03 先輩決定）
  - 返す `meta` は5つのキーだけの新しいオブジェクト。入力を spread しない
- **書き方の注意（`scripts/cage/policy.mjs`）**: `Object.prototype` は書けない。`Object.hasOwn` か `Object.keys` を使う。import は `../config` と型だけ（`@/config` は vitest で解決できない）
- **参照**: `docs/spec.md` §5・§6・§9、K6・K7
- **担当**: 先輩。AGENTS.md §5 は無人運転を本人のパケットに限っているが、先輩の指示で MCP の檻の中で無人運転する（11-03）

## T17 `scripts/safety-rules.ts` と `scripts/check-safety.mjs`（公開リポジトリの安全検査の中身）
- **状態**: RED済み（人、11-03）。人が対話で GREEN まで行う（無人には回さない）
- **依存**: T03（`inspectJpeg`）
- **変えてよいファイル**: `scripts/safety-rules.ts`、`scripts/check-safety.mjs`（RED で `src/config.ts` に `FICTIONAL_AREA` を足す。共有ファイル）
- **テスト（凍結）**: `scripts/safety-rules.test.ts`。**64 件**（`checkFileName` 23・`checkDemoJpeg` 5・`looksLikeJpeg` 3・`decodeText` 5・`checkFieldsArea` 7・`findSecretLikeLines` 21）。46 件で RED、PR #39 のレビュー対応で 18 件を足した
- **合格条件（11-03 本人決定を含む）**:
  - 名前: `.dev.vars`・`.env*`・CSV・`private/` を止める。**JPEG は `public/demo/` の下だけ許す**（中身を見る）。HEIC・DNG はどこでも止める
  - `public/demo/` の JPEG に APP1〜15 があれば止める。JPEG として読めなければ止める（T03 の `inspectJpeg` を注入）
  - **座標は圃場の一覧（`src/data/fields.json`）だけ**を見て、`FICTIONAL_AREA`（P15）の外・数でない座標を止める。端は含む
  - 秘密らしい文字列（API キーの形・`名前=値`・`名前: "値"`・秘密鍵の見出し）の行を見つける。型の宣言・見本・空の値は止めない。**結果にも検査の出力にも値を出さない**
- **参照**: docs/spec.md §10、仕様書 v2.6 §9-2
- **次への申し送り（PR #39 のレビュー）**: 座標の検査は `src/data/fields.json` だけを見る。今はファイルが無いので何もしていない。T09 で一覧を作るときに「一覧が無ければ止める」を足し、区画や道の座標を別に持つなら同じ範囲で検査する → **T09 で「一覧が無ければ止める」を足した（11-03）**。区画や道の座標は、架空の村の地図を作るときに同じ範囲で検査する

## T09 `src/data/fields.json`（架空の 12 圃場）
- **状態**: 人の確認済み（11-03、人が対話で RED から GREEN まで）
- **変えたファイル**: `src/data/fields.json`、`src/data/fields.test.ts`、`scripts/check-safety.mjs`（一覧が無ければ止める）
- **テスト**: `src/data/fields.test.ts`。**9 件**
- **合格条件（11-03 本人決定）**: 12 圃場、4列×3行、**北西から横に** A-01〜A-12、**行ごとに北地区・中地区・南地区**、**名前は地区の頭の字と列の番号**（例 北の1）。座標は `FICTIONAL_AREA` の中、隣の中心は 300〜500m（横 約 415m・縦 約 445m）

## T01 `src/services/photo-meta.ts`（写真の XMP と EXIF から撮影位置と撮影日を読む）
- **状態**: 検査済み・人の確認待ち（11-03）。取り込みは PR のマージで
- **運転の記録（本人の無人運転の試験2、11-03。先輩の T04 の「試験2（MCP の檻）」とは別）**: ブランチ `run/1103-b`、START `5b7cb5f` → GREEN `520875b`（12:16）→ REPORT `6f3d478`（12:17）。モデル Opus・自動モード・`/goal`。C1〜C5 はすべて合格し、試験1のずれ（検査をまとめて出す・`; echo` をつなぐ）は出なかった。人も HEAD で C1・C3・C4・C5 を回し直して合格
- **依存**: T00、T02（`LatLng` の型を借りる）
- **変えてよいファイル**: `src/services/photo-meta.ts` のみ（＋ `docs/run/REPORT.md`、止まったときは `docs/run/QUESTIONS.md`）
- **テスト（凍結）**: `src/services/photo-meta.test.ts`。**23 件**（XMP 6・EXIF 7・両方 3・取れないとき 7）。テストの写真はテストの中でバイト列を組み立てる。運転の後、PR #50 のレビューを受けて人が 9 件足した（計 32 件。時差なしは日本時間・日付も XMP 優先・経度の範囲・実在しない日付・SOS の後ろ・EXIF の片方だけ壊れた・参照なし・細工した XMP の速さ）
- **次への申し送り（PR #50 のレビュー #7）**: `/upload` の `readPhotoInfo` につなぐとき、`PhotoMeta.position` を送る meta に入れない（K6）ことをテストで確かめる。読むのはファイルの先頭（APP1 が入る範囲）だけで足りるかを検討する
- **関数**: `readPhotoMeta(bytes: Uint8Array): PhotoMeta`（`{ position: LatLng | null; takenAt: string | null; takenAtSource: TakenAtSource }`）
- **合格条件（11-03 本人決定を含む）**:
  - JPEG の APP1 の XMP（`http://ns.adobe.com/xap/1.0/` で始まる）と EXIF（`Exif` で始まる、TIFF の II／MM）を読む。SOS か EOI まで、セグメントの見出しだけをたどる
  - XMP: `drone-dji:GpsLatitude`・`GpsLongitude`（綴り違いの `GpsLongtitude` も）・`xmp:CreateDate`。属性と要素の両方の書き方
  - EXIF: GPS IFD の緯度・経度（度分秒の有理数と N/S・E/W）、Exif IFD の `DateTimeOriginal` と `OffsetTimeOriginal`
  - **XMP を EXIF より優先**し、位置と日付は別々に選ぶ。`takenAtSource` は日付の出どころ
  - 日付は日本時間の `YYYY-MM-DD`。時差が書かれていればそれで直し、無ければ日本時間とみなす
  - 位置が null になるもの: 片方しか無い・NaN（0/0 を含む）・0,0・範囲外（|緯度| > 90、|経度| > 180）
  - **読めない・壊れた・JPEG でないときは例外を出さず**、位置なし・日付不明（`none`）
- **RED の確かめ**: 23 件すべて not implemented で失敗。仮の実装で 23 件が通ることを確かめてから空に戻した
- **参照**: docs/spec.md §4「写真の位置情報（分かっている事実）」、§9 のテスト表 photo-meta

## T18 Worker の土台（`worker/`。ルーター・共通の応答・認証の土台）
- **状態**: 検査済み・人の確認待ち（11-03）
- **運転の記録（試験3、MCP の檻）**: START `05810ce` → GREEN `24c8480` → REPORT `0111080`。モデル Opus 5.5、`claude -p`、道具は檻の5つだけ、28手、$0.53。**C1〜C5 がすべて合格**（檻の中の初めての全合格。worktree で `npm ci` した）。変更は許可した6ファイルだけ。REPORT の手元のパスは人が伏せた（`9151a1e`）
- **人の確認**: 本体のチェックアウトで C1・C3（114 件）・C4（テスト全体 677 件）・C5 が合格。実装を9通りに壊して8通りが落ちる（残る1通りは `Allow` の重複で、表に同じ組が無い限り起きない）。手元の `wrangler dev`（workerd、使い捨ての設定）で health 200・静的アセット・501・401・405・404 と共通ヘッダを確認。人が書いた `env.ts` が workerd で動き、bundle が `@/` を解決することも確かめた。`timingSafeEqual` はまだ通っていない（次の session のパケットで確かめる）
- **攻撃役（Sonnet、檻の中）**: 94 件を全部通す手抜きが書けた（区切りを長さと先頭1文字で比べる、Cookie の日数の直書き など）。20 件を足して 114 件にし、手抜きは 12 件落ちるようになった。$0.19
- **依存**: T05（取り込み済み）
- **変えてよいファイル**: `worker/app.ts`・`router.ts`・`http.ts`・`cookies.ts`・`auth.ts`・`routes.ts`（＋ `docs/run/REPORT.md`、止まったときは `docs/run/QUESTIONS.md`）
- **テスト（凍結）**: `worker/router.test.ts`・`cookies.test.ts`・`cookies-days.test.ts`・`auth.test.ts`・`http.test.ts`・`routes.test.ts`・`app.test.ts`。**114 件**
- **人が RED で置いたもの（凍結）**: `worker/deps.ts`（型）、`worker/env.ts`（`crypto`・`env` に触る唯一の場所）、`worker/index.ts`（入口）、`worker/test-helpers.ts`、`vitest.config.ts` の `@` の別名、6 ファイルの空の実装、`routes.ts` の経路の表
- **設計**: Claude Fable 5.1（別のセッション、読み取りだけ、$4.96）。要判断は先輩が決めた（11-03）: D1 のバインディング名は `DB`、Cookie 名は `session`、vitest に `@` の別名、`/api/health` を作る（200 `{ ok: true }` だけ）、末尾スラッシュは 404、未実装の経路は 501、HEAD・OPTIONS は 405
- **合格条件**:
  - `/api` と `/api/` で始まらないパスは `deps.assets` の応答をそのまま返す（ヘッダも触らない）
  - 経路は区切りごとの完全一致と `:name`。正規化しない。404 と 405（`Allow` は表の順、`, ` 区切り）は認証より先
  - `auth: "none"` の経路は Cookie を読まない（hmac を呼ばない）。member は 401、admin は 401 と 403
  - 失敗の本文は `{ error }` だけ。未捕捉の例外は 500 `{ error: "internal" }` で `console.error` に残す
  - API の応答には、無いときだけ `Cache-Control: no-store` と `X-Content-Type-Options: nosniff`
  - Cookie の `Max-Age` は `SESSION_DAYS` から計算する
  - `nowMs` はミリ秒。秒に直すのは `auth.ts` だけ
- **書き方の注意（`scripts/cage/policy.mjs`）**: `Response.json()` は使わず `new Response(JSON.stringify(...))`。`Date.now()`・`crypto` を檻の側で呼ばない（必ず `deps`）。import は `./deps`（型）・`./...`・`@/services/session-token`・`@/config` だけ
- **担当**: 先輩。先輩の指示で MCP の檻の中で無人運転する（11-03）
- **申し送り（本人へ）**: `wrangler.jsonc` は本人の側で作る。バインディング名 `DB`・`PHOTOS`・`ASSETS`、Secret `MEMBER_PASSPHRASE`・`ADMIN_PASSPHRASE`・`SESSION_SECRET`。設計の推奨は assets の `run_worker_first: ["/api/*"]`（推測を含む）。画面が自分の役割を知る方法（`X-Role` のヘッダ／200 `{role}`／`GET /api/session`）は次のパケットの前に決める

## T19 `POST /api/session` と `GET /api/session`（合言葉 → Cookie、失敗は 10 分に 5 回まで、役割）
- **状態**: 検査済み・人の確認待ち（11-03）
- **運転の記録（試験4、MCP の檻）**: START `cd75d0d` → GREEN `e9cda9e` → REPORT `ef13a71`。モデル Opus 5.5、`claude -p`、道具は檻の5つだけ、26手、$0.63。**C1〜C5 がすべて合格**。変更は許可した3ファイルだけ。REPORT の手元のパスは、push の前に REPORT のコミットそのものを伏せた版に入れ直した（T18 のように途中のコミットに残らない）
- **人の確認**: 本体のチェックアウトで C1・C3（173 件）・C4（テスト全体 923 件、lint エラー 0・警告 2）・C5 が合格。実装を 13 通りに壊して 13 通りとも落ちる（上限の境界・Retry-After の切り捨て・枠の単位・日本時間の日付・415 を飛ばす・X-Forwarded-For・429 でも照合・数えない・合言葉を削る・他のキーを許す・GET が端末 ID を返す・content-length を見ない・IP なしで空文字）。手元の `wrangler dev`（本物の `wrangler.jsonc`、使い捨ての値と D1）で 415・400・401×5・6 回目は正しい合言葉でも 429 と `Retry-After`・204 と Cookie・`GET` 200 `{"role":"admin"}`・Cookie なしの `GET` 401・`DELETE` 405 `Allow: POST, GET` を確認。D1 の key は 43 文字のハッシュで、生の IP は無い。手元では送り手が付けた `CF-Connecting-IP` がそのまま通った（本番は Cloudflare が付け直す。dev で確かめる）
- **レビューの後（#59、人が対話で RED → GREEN）**: 別のセッションのレビュー（`docs/reviews/pr-58-session.md`）の指摘 1・4 を直した。本文は `request.text()` をやめて読みながらバイトで数え、1024 バイトを超えた所で読むのをやめて 413。IPv6 は上位 64 ビットにまとめて数える。テストを 15 件足した（全体 958 → 973）（上限はバイト・ちょうど 1024 バイト・多バイト文字が区切りをまたぐ・空の本文・同じ /64 と別の /64 など）。実装を 8 通りに壊して 8 通りとも落ちる。手元の `wrangler dev` で、5MB の chunked の本文は 0.14 秒で 413、同じ /64 の 6 回目は 429、別の /64 は 401。残り（本番の `CF-Connecting-IP` の確認・古い行の掃除）は #59 に
- **2 回目のレビューの後（人が対話で RED → GREEN）**: 「数を読む → 照合 → 数える」の間に同じ枠の要求が入れるので、同時に送れば上限を越えて照合できた（偽の D1 で 10 本同時に 10 回照合）。照合の前に、上限未満のときだけ 1 を足して返す 1 文（UPSERT の WHERE と RETURNING）で枠を取り、行が返らなければ 429、一致したら batch で 1 戻して 0 の行を消す。テスト用の D1 の batch も、本物と同じく間に何も入らない形に直した。実装を 6 通りに壊して 6 通りとも落ちる。手元の `wrangler dev`（本物の D1 の模擬）で、同時に 20 本の失敗が 401 ×5・429 ×15 になり、成功で取った枠が戻ることを確認
- **Issue**: #54
- **依存**: T18（取り込み済み）、T11（`usage_counters`）、T05（`issueSessionToken`）
- **変えてよいファイル**: `src/services/usage-limit.ts`・`src/services/session-request.ts`・`worker/session.ts`（＋ `docs/run/REPORT.md`、止まったときは `docs/run/QUESTIONS.md`）
- **テスト（凍結）**: `src/services/usage-limit.test.ts`・`usage-limit-config.test.ts`・`session-request.test.ts`・`worker/session.test.ts`・`session-config.test.ts`、T18 のテストの直し（`routes.test.ts`・`router.test.ts`・`app.test.ts`）。新しい 5 本で **108 件**
- **人が RED で置いたもの（凍結）**: 3 ファイルの空の実装、`worker/routes.ts` の配線（`GET /api/session` は表の末尾）、`worker/http.ts` のエラーの種類 3 つ、`worker/auth.ts` の `nowSec`、`worker/test-db.ts`（`node:sqlite` の偽の D1）、`worker/test-helpers.ts` の `jsonRequest`
- **RED の確かめ**: 新しい 3 本の 97 件のうち 93 件が失敗（not implemented と 500）。通る 4 件は、空の実装の定数・認証の 401・D1 を触らない・500 で漏らさない。仮の実装で 289 件（worker と 2 本）がすべて通り、檻の純粋関数の検査も通ることを確かめてから空に戻した
- **攻撃役（Sonnet、檻の中、21 手、$0.24）**: 97 件を全部通す手抜きが書けた（枠・上限・日数の直書き、SELECT してから INSERT／UPDATE の2段の数え方、session が null でも `{}` を返す GET）。11 件を足して 108 件にし、手抜きは 6 件落ちるようになった。仕様の外として入れなかったもの: 古い行の掃除（このパケットではしない）、`CF-Connecting-IP` の空白や複数の値（Cloudflare が1つの IP を付ける）、Content-Type の崩れた形、同じキーの重複・BOM（`JSON.parse` に任せる）
- **設計**: Claude Fable 5.1（別のセッション、読み取りだけ、53 手、$3.83）。要判断は先輩が決めた（11-03、#54 のコメント）
- **合格条件**:
  - 順番は 415（Content-Type が `application/json` でない）→ 413（`content-length` か本文が 1024 文字超。ヘッダで分かれば本文を読まない）→ 400（JSON でない・オブジェクトでない・他のキー・`passphrase` が無い・文字列でない）→ 枠の数を読む → 照合 → 401 か 204。415・413・400 では D1 も `hashIp` も照合も使わない
  - IP は `CF-Connecting-IP` だけ。無い・空なら `"unknown"`。`X-Forwarded-For` は見ない。`hashIp(IP, UTC の日付)`
  - 枠は UTC の固定 10 分。key は `login:<IPのハッシュ>:<YYYY-MM-DDTHH:MM>`、`expires_at` は枠の終わりの ISO
  - 数えるのは不一致（401）だけ。空の合言葉も数える。UPSERT で 1 ずつ。成功しても数を戻さない
  - 枠の数が 5 以上なら 429 `{ error: "too_many_attempts" }` と `Retry-After`（枠の終わりまでの秒、切り上げ、最小 1）。照合も書き込みもしない（正しい合言葉でも 429）
  - 成功は 204、本文なし、`Set-Cookie` 1 本（`buildSessionCookie`）。端末 ID は毎回 `deps.newId()`、`exp` は `nowSec + SESSION_DAYS` 日。合言葉は削らずに照合へ
  - `GET /api/session`（member 以上）は 200 `{ role }` だけ。D1 を触らない
  - 例外は握らない（500 は `app.ts`）。合言葉・IP を D1 にも console にも残さない
- **書き方の注意（`scripts/cage/policy.mjs`）**: `Date.now()`・`new Date()`（引数なし）は使わない（時刻は `deps.nowMs`）。`new Date(ms).toISOString()` は使ってよい。秒に直すのは `auth.ts` の `nowSec`。import は Service が `../config`、worker が `@/config`・`@/services/...`・`./...`
- **担当**: 先輩。`usage-limit.ts`（担当「後で決める」）は先輩が作る（11-03 先輩の決定、本人に確認する）

## T20 `POST /api/uploads`（縮小画像と meta を検査し、R2 と D1 に「未確定」で残す）
- **状態**: 検査済み・人の確認待ち（11-03）
- **運転の記録（試験5、MCP の檻）**: START `135955c` → GREEN `e7bd388` → REPORT `df9f232`。モデル Opus 5.5、`claude -p`、道具は檻の5つだけ、29手、$0.87。**C1〜C5 がすべて合格**。変更は許可した2ファイルだけ。QUESTIONS なし。REPORT の手元のパスは、push の前に REPORT のコミットそのものを伏せた版に入れ直した。TASKS に無い判断は1つ（二重と分かった直後に読み直して先の行が無ければ例外にして 500。起きない場面の保険）
- **人の確認**: 本体のチェックアウトで C2（3 ファイル）・C3（139 件）・C4（テスト全体 1105 件、lint エラー 0・警告 2）が合格。C1・C5 には、運転と関係の無い Git 管理外の 2 ファイル（`.agents/skills/role-brief/SKILL.md`・`.codex/hooks.json`、17:26 に本体のチェックアウトにできた）が出たので、触らずに残した。実装を 17 通りに壊して 15 通りが落ちる。残る 2 つのうち「余分な欄を許す」は下のループが同じ判定をするので動きが変わらない。「content-length の判定を画像の上限で行う」はテストの要求に content-length が無いので落ちなかった → 本当の content-length を付けた 3MB ちょうどのテストを足した（`ae64b9c`。全体 1106 件）。手元の `wrangler dev`（本物の `wrangler.jsonc`、使い捨ての値と D1・R2、テストと同じ形の使い捨ての JPEG）で、201・同じハッシュで 409（同じ id）・APP1 で 422 metadata・長辺 2000 で 422 bad_dimensions・余分な欄 lat で 422 bad_form・meta に distance で 422 unknown_key・3MB 超で 413・JSON で 415・Cookie なしで 401。D1 は未確定の 1 行（field_id null、候補は番号だけ）、R2 の画像は送ったものとバイトまで同じ。CPU time は手元では測れない（dev へのデプロイ後に本人が確かめる）
- **レビューの後（PR #64 のレビュー #1、人が対話で RED → GREEN）**: `inspectJpeg` は最初の SOS で止まるので、2 枚目のスキャンの前に隠した APP1 と、EOI の後ろに足して FF D9 で終えたものが通っていた。`jpeg-segments.ts` に `scanJpegMarkers`（最初のスキャンの後ろまでセグメントをたどる。中身は長さで飛ばし、スキャンの中は indexOf で FF を探して詰め物と RST を飛ばす。例外は出さない）を足し、`checkUploadImage` が後ろの APP1〜15 を metadata、最初の EOI でちょうど終わらないものを not_jpeg にする（順は変えない）。テストを 18 件足した。壊して確かめると 7 通りとも落ちる。手元の `wrangler dev` で、隠した 2 つは 422（metadata・not_jpeg）、ふつうの画像は 201。3MB のスキャンをたどる時間は手元の Node で中央値 1.9ms（推測では Worker の合計は 5〜8ms。dev で確かめる）
- **Issue**: #60
- **依存**: T03（`inspectJpeg`）、T04（`parseUploadMeta`）、T11（`uploaded_photos`）、T18（土台）、T19（session、`body.ts` の元）。T08「保存の失敗」はここに吸収した
- **変えてよいファイル**: `src/services/upload-form.ts`・`worker/uploads.ts`（＋ REPORT、止まったときは `docs/run/QUESTIONS.md`）
- **テスト（凍結）**: `src/services/upload-form.test.ts`（52 件）・`worker/uploads.test.ts`（41 件）・`worker/uploads-config.test.ts`（2 件）、計 **95 件**、`worker/app.test.ts` の直し（`POST /api/uploads` を 501 から 415 に）
- **人が RED で置いたもの（凍結）**: 2 ファイルの型・定数と空の実装、`worker/body.ts`（session から切り出し、`Uint8Array<ArrayBuffer>` を返す）とそのテスト、`session.ts` の直し、`routes.ts` の配線、`http.ts` の `"unprocessable"`、`Deps.knownFieldIds`（`env.ts` で `fields.json` から）、`test-bucket.ts`（偽の R2）、`test-helpers.ts` の `tinyJpeg`・`multipartBody`・`multipartRequest`
- **RED の確かめ**: 新しいテストの 87 件のうち 84 件と、`app.test.ts` の直した 2 件が失敗（not implemented と 500）。仮の実装で worker と Service の 352 件がすべて通り、檻の純粋関数の検査も通ることを確かめてから空に戻した
- **攻撃役（Sonnet、檻の中、21 手、$0.40）**: 87 件を全部通す手抜きが書けた（長辺の上限の引数を捨てて config を直接読む、末尾の最後の 1 バイトだけ見る、INSERT のエラー文に UNIQUE を含めば 409、`Object.values` で値を並べる、multipart の先頭一致）。8 件を足して 95 件にし、手抜きは 6 件落ちるようになった。正しい実装で worker と Service の 360 件が通る
- **設計**: Claude Fable 5.1（別のセッション、読み取りだけ、83 手、$6.43）。要判断 14 件は先輩がすべて推奨どおりに決めた（11-03、#60 のコメント）
- **合格条件**:
  - 順番: 401（`app.ts`）→ 415（media type が `multipart/form-data` でない）→ 413（`content-length` が `UPLOAD_BODY_MAX_BYTES` 超。本文を読まない）→ `readBodyLimited` で上限まで読む（超えたら 413）→ `new Response(本文, { headers: { "content-type": 元の値 } }).formData()`（投げたら 415。`request.formData()` は使わない）→ 欄（`checkUploadParts`、422 `bad_form`）→ 画像（`checkUploadImage`、`too_large` は 413、他は 422）→ meta（`parseUploadMeta(meta, deps.knownFieldIds)`、`too_long` も 422）→ 二重を SELECT（あれば 409 `{ id }`）→ R2 → D1
  - 422 の本文は `{ error: "unprocessable", reason }` だけ。reason は固定のコード（`bad_form`・`too_large` 以外の画像の理由・T04 の理由）で、入力の値を入れない。409 と 201 の本文は `{ id }` だけ
  - 画像の拒否は 4 つ: `MAX_UPLOAD_BYTES` 超、APP1〜15、長辺が `THUMBNAIL_LONG_EDGE_PX` 超、末尾が `FF D9` でない。`inspect` が投げたら種類を問わず `not_jpeg`
  - `contentHash` は形だけ見て信じる（T04）。Worker でハッシュを計算しない
  - R2 のキーは `uploads/<id>.jpg`、`contentType` は `image/jpeg`、id は `deps.newId()` を 1 回。時刻は `new Date(deps.nowMs()).toISOString()`
  - D1 は `PHOTO_COLUMNS` と `photoRowValues` から組んだ 1 文の `INSERT … ON CONFLICT(content_hash) DO NOTHING RETURNING id`。null なら置いた画像を消して 409 `{ id }`（既にある行の id）。エラー文は照合しない。INSERT が投げたら置いた画像を消して投げ直す（500）。片付けの delete が投げたら `console.error` に R2 のキーを残して元の例外を投げる
  - `chosenFieldId` があっても `state` は `unconfirmed`、`field_id` は null。`uploader_device` は Cookie の端末 ID
  - ファイル名・欄の Content-Type は読まない。`console` は片付けの失敗のときだけ
- **書き方の注意（`scripts/cage/policy.mjs`）**: `Date.now()`・`new Date()`（引数なし）・`crypto` は使わない。`instanceof File` を使わず `typeof value === "string"` で分ける。import は Service が `../config`・`@/types`・`./jpeg-segments`、worker が `@/config`・`@/services/...`・`./...`
- **担当**: 先輩

## T21 `GET /api/photos/recent` と `GET /api/photo-files/:id`（新着の一覧と画像の配信。認証なし）
- **状態**: 検査済み・人の確認待ち（11-03）
- **運転の記録（試験6、MCP の檻）**: START `1e4e8eb` → GREEN `2833e43` → REPORT `8f6f13c`。モデル Opus 5.5、`claude -p`、道具は檻の5つだけ、27手、$0.66。**C1〜C5 がすべて合格**。変更は許可した3ファイルだけ。QUESTIONS なし。**直した檻（#66）の初めての運転**: `report` が `docs/run/REPORT-T21.md` に書き、作業フォルダは `<作業フォルダ>` に伏せられ、ユーザー名・セッションのフォルダ・色の制御文字は 0 件。人が名前を変えたり、REPORT のコミットを作り直したりしなくてよかった
- **人の確認**: 本体のチェックアウトで C2（4 ファイル）・C3（103 件）・C4（テスト全体 1184 件、lint エラー 0・警告 2）が合格。C1・C5 には運転と関係の無い Git 管理外の 2 ファイルが出た（T20 と同じもの）。実装を 14 通りに壊して 13 通りが落ちる。残る 1 つ（同じ時刻の並びの id DESC を外す）は、テストが入れた順で偶然そろっていたので、入れた順と id の順を逆にした（`10b5714`）。手元の `wrangler dev`（使い捨ての値と D1・R2）で、3 枚送って一覧は新しい順・11 項目・ハッシュと R2 のキーなし・no-store、limit=1 で 1 件・abc で既定・1&5 で 1 件、画像は 200・image/jpeg・content-length・private, max-age=86400 で送ったものとバイトまで同じ、無い画像は 404、POST は 405 Allow: GET、壊れた Cookie でも 200
- **Issue**: #67
- **依存**: T11（`uploaded_photos`）、T18（土台）、T20（`r2KeyFor`・R2 のキー）
- **変えてよいファイル**: `src/services/photo-query.ts`・`worker/photos.ts`・`worker/photo-files.ts`（＋ `docs/run/REPORT-T21.md`、止まったときは `docs/run/QUESTIONS.md`）
- **テスト（凍結）**: `src/services/photo-query.test.ts`・`worker/photos.test.ts`・`worker/photos-config.test.ts`・`worker/photo-files.test.ts`（計 73 件）、`worker/app.test.ts` の付け替え（「認証なしの経路は 501」の 3 つを `GET /api/photos` に）
- **人が RED で置いたもの（凍結）**: `src/config.ts` の `RECENT_LIMIT_DEFAULT = 50`・`RECENT_LIMIT_MAX = 200`（共有ファイル）、`photo-query.ts` の `PHOTO_LIST_COLUMNS`・`PhotoListRow` と空の関数、2 つのハンドラの空の実装と `PHOTO_FILE_CACHE_CONTROL`、`routes.ts` の配線、`docs/privacy.md` の「送った端末」の行（本人の承認待ち）
- **RED の確かめ**: 新しい 66 件のうち 56 件が失敗。通る 10 件は、人が置いた定数・列の一覧と、空の実装でも成り立つ 405・500・`..` の 404。仮の実装で `src/services` と `worker` の 854 件がすべて通り、檻の純粋関数の検査も通ることを確かめてから空に戻した
- **攻撃役（Sonnet、檻の中、17 手、$0.19）**: 66 件を全部通す手抜きが書けたが、使った手抜きは 1 つ（候補の列が文字列の配列かを先頭の要素だけで確かめる）。7 件を足して 73 件にし、手抜きは 3 件落ちる。正しい実装で 42 件（photo-query）が通る。入れなかった指摘: R2 のメタデータの contentType を見る（R2 の口が返さないので image/jpeg に決めてある）、本文をメモリに読まずに渡すこと・uploaded_at の形の違い（決めていない。uploads が 1 つの形で書く）
- **設計**: Claude Fable 5.1（別のセッション、読み取りだけ、71 手、$4.93）。要判断は先輩が決めた（11-03、#67 のコメント）
- **合格条件**:
  - 一覧: `limit` は `ctx.url.searchParams.get("limit")`（最初の値）を `parseRecentLimit` に通す（`/^[1-9]\d*$/` でなければ既定、上限を超えれば上限。400 にしない）。SQL は 1 文 `SELECT <PHOTO_LIST_COLUMNS> FROM uploaded_photos ORDER BY uploaded_at DESC, id DESC LIMIT ?`（`*` を使わない、件数は bind）→ `all()` の `results` を `photoFromRow` で写す → `json(200, …)`。JS で並べ替え・絞り込みをしない
  - `photoFromRow` は UploadedPhoto の 11 項目をこの順で（`id`・`fieldId`・`chosenFieldId`・`state`・`candidateFieldIds`・`takenAt`・`takenAtSource`・`width`・`height`・`uploadedAt`・`uploaderDevice`）。変換は `candidate_field_ids` の `JSON.parse` だけで、文字列の配列でなければ `candidate_field_ids` を含む文の Error を投げる（500）。null・確定で番号なしもそのまま。行のほかの列は写さない
  - 写真のハッシュ・R2 のキー・大きさ・更新時刻は返さない。端末 ID と委員が選んだ番号は返す（先輩の決定）
  - 画像: `deps.photos.get(r2KeyFor(params.id))`。無ければ 404 `{ error: "not_found" }`。あれば 200、本文は R2 の `body` をそのまま、`content-type: image/jpeg`・`content-length: size`・`cache-control: PHOTO_FILE_CACHE_CONTROL`。`params.id` は復号も検査もしない。D1 は触らない
  - どちらも認証なし（Cookie を読まない）。例外は握らない。`console`・`Date`・`crypto` を使わない。一覧は `cache-control` を触らない（共通ヘッダの `no-store`）
- **書き方の注意（`scripts/cage/policy.mjs`）**: import は Service が `../config`・`@/types`、worker が `@/services/...`・`./...`。`Response.json()` を使わず `http.ts` の `json()`
- **担当**: 先輩

## T22 `GET /api/photos?fieldId=`（圃場ごとの確定済みの写真。認証なし）
- **状態**: 検査済み・人の確認待ち（11-04）
- **運転の記録（試験7、檻リレー v0.6 の初めての運転、#86）**: 進行役 `scripts/relay/run-day.mjs` が 1 本の列車として起動。START `380579d` → GREEN `aadfc55` → REPORT `785b518`。モデル Opus 5.5、`claude -p`、道具は檻の5つだけ、12手、$0.51。ゲート G0〜G7 は green。変更は許可した 2 ファイルだけ。QUESTIONS なし。C1〜C5 合格（C3 118 件、C4 テスト全体 1274 件、lint エラー 0・警告 2）。REPORT に手元のパスなし。通知係の役の watch.mjs が「列車終了: GREEN 1／ask 0／stopped 0、$0.51」を出した
- **人の確認**: まだ（先輩が差分を読んでからマージ。CLAUDE.md の無人運転の PR の例外）
- **Issue**: #85
- **依存**: T21（`PHOTO_LIST_COLUMNS`・`photoFromRow`・`RECENT_LIMIT_MAX`）
- **変えてよいファイル**: `src/services/photo-query.ts`・`worker/photos.ts`（＋ `docs/run/REPORT-T22.md`、止まったときは `docs/run/QUESTIONS.md`）
- **テスト（凍結）**: `src/services/photo-query.test.ts`（`parseFieldIdQuery` 18 件を足した）・`worker/photos-field.test.ts`（24 件）・`worker/photos-config.test.ts`（1 件を足した）・`worker/app.test.ts`（「認証なしの経路は 501」を health に付け替え）・`worker/routes.test.ts`（`GET /api/photos` の付け先）
- **人が RED で置いたもの（凍結）**: `photo-query.ts` の `parseFieldIdQuery` の空の実装、`worker/photos.ts` の `getPhotosByField` の空の実装、`routes.ts` の配線
- **関数**: `parseFieldIdQuery(raw: string | null, knownFieldIds: ReadonlySet<string>): string | null`（一覧にある番号ならそのまま、それ以外は null。例外を出さない）、`getPhotosByField: Handler`
- **合格条件**:
  - `fieldId` は `ctx.url.searchParams.get("fieldId")`（最初の値）を `parseFieldIdQuery(…, deps.knownFieldIds)` に通す。null なら 400 `{ error: "bad_request" }` で、D1 を触らない（`http.ts` の `errorResponse`）
  - 一覧にある番号と完全に一致するものだけ（大文字小文字・前後の空白を直さない）
  - SQL は 1 文。`SELECT <PHOTO_LIST_COLUMNS> FROM uploaded_photos WHERE state = 'confirmed' AND field_id = ? ORDER BY …`（`*` を使わない）。番号と件数は bind で渡し、SQL の文字列に番号を入れない
  - 並び: 撮影日（`taken_at`）の新しい順、撮影日が null のものは後ろ、同じなら `uploaded_at` の新しい順、さらに同じなら `id` の降順。JS で並べ替え・絞り込みをしない
  - 件数の上限は `RECENT_LIMIT_MAX`（200）。`limit` のクエリは読まない
  - 本文は `results.map(photoFromRow)` を `json(200, …)`。候補の列が壊れた行は 500（握らない）
  - 認証なし（Cookie を読まない）。`console`・`Date`・`crypto`・R2・`newId`・`nowMs` を使わない。`cache-control` を触らない（共通ヘッダの `no-store`）
- **RED の確かめ（11-04）**: 新しいテストのうち空の実装で失敗するのは 41 件。通るのは、空の実装でも成り立つ 500 の 2 件・405・人が置いた配線と付け替えた health の 2 件。仮の実装で `src/services` と `worker` の 951 件がすべて通り、檻の純粋関数の検査も通ることを確かめてから空に戻した
- **攻撃役（Sonnet、檻の中、仕様・決まりのファイルを消した複製で）**:
  - 1 回目（12 手、$0.16）: 114 件を全部通す手抜きが書けた。使った手抜きは 2 つ（圃場の一覧を A-01〜A-12 に決め打ち、上限の 200 を直書き）。3 件を足した（一覧は `deps.knownFieldIds` に従う、上限は config に従う、委員の番号と別の圃場に確定した行）
  - 2 回目（14 手、$0.16）: 118 件を通す手抜きは書けず、正しい実装が最小になった
  - 入れなかった指摘: 撮影日の形の違い（`2026-7-5`・時刻付き）は uploads が `YYYY-MM-DD` だけを書く（T04・T20）ので起きない。`taken_at_source` との食い違いも同じ。上限ちょうど・1 少ない場合は LIMIT の bind で、201 枚と config の差し替えで十分。`?fieldId=A-01&fieldId=`・URL エンコードは `searchParams` の仕様で、最初の値のテストで足りる。撮影日が null 同士の id の降順は、撮影日ありの同じ並びのテストと同じ式なので足さない
- **決めたこと（先輩、11-04）**: 一覧に無い番号は 404 ではなく 400（spec §6 の誤りの欄が 400 だけ）。上限は新着と同じ 200（ページ送りは作らない）
- **書き方の注意（`scripts/cage/policy.mjs`）**: import は Service が `@/config`・`@/types`、worker が `@/services/...`・`./...`。`Response.json()` を使わず `http.ts` の `json()`・`errorResponse()`
- **参照**: `docs/spec.md` §6、`docs/privacy.md`
- **担当**: 先輩

## T06 `photo-groups.ts`（圃場ページの写真を撮影日ごとにまとめる。L1）
- **状態**: RED済み（人、11-03 夜）。攻撃役と凍結はまだ（先輩がハーネスを少し変えるので、変わった手順で行う）
- **運転の予定**: 11-04、MCP の檻（Service だけのパケット、11-03 決定①）。手順は本人の手元の `手順_檻の運転_本人PC_20261103.md`
- **依存**: なし（`@/types` の `UploadedPhoto` だけ）
- **変えてよいファイル**: `src/services/photo-groups.ts` のみ（＋ `docs/run/REPORT-T06.md`、止まったときは `docs/run/QUESTIONS.md`）
- **テスト（凍結の予定）**: `src/services/photo-groups.test.ts`（13 件）
- **人が RED で置いたもの**: `PhotoGroup` の型（`takenAt: string | null`・`photos: UploadedPhoto[]`）と空の関数 `groupFieldPhotos(photos, fieldId)`。共有ファイルは変えていない
- **RED の確かめ**: 13 件すべてが not implemented で落ちる。仮の実装で 13 件が通り、檻の純粋関数の検査も通ることを確かめてから空に戻した。lint・型・安全検査はそれぞれ単独で通る
- **並び（11-03 本人決定）**: 撮影日の新しい日が先、日付不明（`takenAt: null`）はいちばん後ろの別枠。同じ日の中は送った時刻（`uploadedAt`）の新しい順、同じ時刻なら id の大きい順
- **合格条件**:
  - 出すのは `state === "confirmed"` かつ `fieldId === 引数` の写真だけ（完全一致。大文字小文字・空白を区別）。未確定は、候補・委員が選んだ番号・矛盾した `fieldId` があっても出さない
  - 同じ撮影日は 1 つの枠。空の枠を作らない。該当が無ければ `[]`
  - 枠の項目は `takenAt` と `photos` の 2 つだけ。写真はそのままのものを入れる（写しを作らない）。元の配列と写真は変えない
  - 例外を出さない。`console`・`Date`・`crypto` を使わない
- **書き方の注意（`scripts/cage/policy.mjs`）**: import は `@/types` だけ
- **担当**: 本人
