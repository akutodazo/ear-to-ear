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

## T23 `DELETE /api/status-events/:id`（判断の取り消し。委員以上、L1）
- **状態**: 検査済み・人の確認待ち（11-04）
- **運転の記録（檻リレー v0.6 の 2 本目、1104 の列車）**: START `3949c30` → GREEN `86518ab` → REPORT `05e317d`。モデル Opus、`claude -p`、道具は檻の5つだけ、15 手、$0.51。ゲート G0〜G7 は green。変更は許可した 2 ファイルだけ。QUESTIONS なし。C1〜C5 合格（C3 66 件、C4 テスト全体 1420 件、lint エラー 0・警告 2）。REPORT に手元のパスなし。watch.mjs の「列車終了: GREEN 1／ask 0／stopped 0、$0.51」をこのセッションから PushNotification でスマホに送った
- **Claude の確認（11-04、人の確認の前）**: 実装を 10 通りに壊して 10 通りとも落ちる（取り消し済みの条件を外す 3 件・時刻の固定 1・先頭の 0 を許す 5・安全な整数の上限を外す 3・要素の型を見ない 2・例外に中身 2・revokedAt を返さない 4・reasons を空 9・読んでから書く 2 文 1・id を確かめずに D1 へ 7）。手元の `wrangler dev`（使い捨ての値と、使い捨ての置き場の D1）で、Cookie なし 401、委員で 200 と 9 項目、もう一度 404、999・abc・01 は 404、GET は 405 Allow: DELETE、すべて no-store、同時 2 本は 200 と 404、表は行が残り revoked_at が入った
- **人の確認**: まだ（先輩が差分を読んでからマージ。CLAUDE.md の無人運転の PR の例外）
- **Issue**: #89
- **依存**: T11（`field_status_events`）、T18（土台）。T12（`status-reason`、本人）には依存しない
- **変えてよいファイル**: `src/services/status-events.ts`・`worker/status-events.ts`（＋ `docs/run/REPORT-T23.md`、止まったときは `docs/run/QUESTIONS.md`）
- **テスト（凍結）**: `src/services/status-events.test.ts`・`worker/status-events.test.ts`・`worker/routes.test.ts`（DELETE の経路を足した）
- **人が RED で置いたもの（凍結）**: `status-events.ts` の `STATUS_EVENT_COLUMNS`・`StatusEventRow` と 2 つの関数の空の実装、`worker/status-events.ts` の `deleteStatusEvent` の空の実装、`routes.ts` の配線（表の末尾）
- **関数**: `parseStatusEventId(raw: string): number | null`、`statusEventFromRow(row: StatusEventRow): StatusEvent`、`deleteStatusEvent: Handler`
- **合格条件**:
  - `:id` は `/^[1-9]\d*$/` で `Number.MAX_SAFE_INTEGER` 以下のときだけ数。それ以外は 404 `{ error: "not_found" }` で、D1 を触らない
  - 行は消さず、`revoked_at` が null の行だけに `new Date(deps.nowMs()).toISOString()` を入れる。無い id・取り消し済みは 404 で、最初の取り消しの時刻を変えない。同時に 2 本来ても 200 は 1 本だけ（条件付きの UPDATE 1 文で、読んでから書く 2 文にしない）
  - 成功は 200 で、取り消した判断を `statusEventFromRow` で `StatusEvent` にして `json(200, …)`。列は `STATUS_EVENT_COLUMNS`（`*` を使わない）。値は bind で渡す
  - `reasons`・`ref_photo_ids` が文字列の配列の JSON でない行は例外（500、握らない）。例外のメッセージに列の名前を入れ、中身を入れない
  - 本文は読まない。`console`・`Date.now`・`crypto`・R2・`newId` を使わない。`cache-control` を触らない（共通ヘッダの `no-store`）
- **RED の確かめ（11-04）**: 空の実装で 56 件が失敗。通るのは空でも成り立つ 10 件（`routes.test.ts` の 5 件・401 の 2 件・500 の 2 件・405）。仮の実装で新しい 66 件と src・worker の 1074 件が通り、檻の純粋さの検査も通ることを確かめてから空に戻した
- **攻撃役（Sonnet、檻の中、仕様・決まりのファイルを消した複製で。13 手、$0.13）**: 手抜きを探す前に素直な最小の実装を書いて 66 件が通り、手抜きは試さなかった（報告にそう書いた）。縛っていたもの: id の境界 22 件と「D1 を触らない」、9 項目だけ・配列が別もの、`deps.nowMs`、2 回目の 404 と時刻の保持、同時 2 本で 200 が 1 本（読んでから書く形では通らない）。人も手抜きの形（読んでから書く 2 文、`revoked_at IS NULL` を外す、固定の時刻）を考え、それぞれに当たるテスト（同時 2 本・続けて 2 回・nowMs）があると読んだ（実装して試してはいない）
  - 入れなかった指摘: `status`・`note`・`id` の型の検査（表の CHECK と型で決まる。T21・T22 の `photoFromRow` も見ない）。`params.id` が無い場合（経路の型で必ずある）。本物の D1 の `RETURNING` と同時実行（人の確認の `wrangler dev` で見る）。T24 の一覧が取り消しを除くか（T24 のテストで見る）
  - 攻撃役の `report` は `CAGE_CHECKS` が空のため拒まれ、報告は返答の本文で受けた。手抜きの実装は捨てた
- **決めたこと（先輩、11-04）**: 取り消し済みをもう一度取り消すと 404（無い判断と同じ）。成功の本文は取り消した `StatusEvent`（共有ファイルを変えない）。取り消した人の端末は記録しない（表に列が無い。要るなら T25 の前に決める）
- **書き方の注意（`scripts/cage/policy.mjs`）**: import は Service が `@/types`、worker が `@/services/...`・`./...`。`Response.json()` を使わず `http.ts` の `json()`・`errorResponse()`
- **参照**: `docs/spec.md` §6
- **担当**: 先輩

## T24 `GET /api/fields/summary`（地図用の各圃場のまとめ。認証なし、L1）
- **状態**: 検査済み・人の確認待ち（11-04）
- **運転の記録（1104 の列車の 2 本目、`--skip T23`）**: START `290fe5b` → GREEN `bf9231b` → REPORT `deaecee`。モデル Opus、`claude -p`、道具は檻の5つだけ、13 手、$0.53。ゲート G0〜G7 は green。変更は許可した 2 ファイルだけ。QUESTIONS なし。C1〜C5 合格（C3 63 件、C4 テスト全体 1478 件、lint エラー 0・警告 2）。REPORT に手元のパスなし。watch.mjs の「列車終了: GREEN 2／ask 0／stopped 0、$1.03」をこのセッションから PushNotification でスマホに送った
- **Claude の確認（11-04、人の確認の前）**: 実装を 11 通りに壊して 10 通りが落ちる（取り消しを見ない 2・at を逆に 2・同じ at で id を小さい方 2・委員の番号を見ない 3・候補の 1 位だけ 2・要素の型を見ない 3・確定済みも読む 2・行を検証しない 8・圃場の順を並べ替える 1・一覧に無い番号も返す 3）。残る 1 つ（SQL の `revoked_at IS NULL` を外す）は Service でも取り消しを除くので結果が同じ（取り消し済みの壊れた行は縛らないと決めた）。手元の `wrangler dev`（使い捨ての値と D1）で、200・12 圃場・`{ fields }` だけ・no-store、A-03 は取り消した新しい判断を飛ばして古い方、A-04 は有効な判断、印は候補の A-01・A-02 と委員の番号の A-07 だけ（確定済みの写真の A-09・A-10・A-11 には付かない）、壊れた Cookie でも 200、POST は 405 Allow: GET。T23 で残りの判断を取り消すと A-03 は null になった
- **人の確認**: まだ（先輩が差分を読んでからマージ。CLAUDE.md の無人運転の PR の例外）
- **Issue**: #90
- **依存**: T23（`STATUS_EVENT_COLUMNS`・`statusEventFromRow`。PR #93 の上に積む）、T11、T18
- **変えてよいファイル**: `src/services/field-summary.ts`・`worker/fields.ts`（＋ `docs/run/REPORT-T24.md`、止まったときは `docs/run/QUESTIONS.md`）
- **テスト（凍結）**: `src/services/field-summary.test.ts`・`worker/fields.test.ts`・`worker/routes.test.ts`（GET の経路を足した）
- **人が RED で置いたもの（凍結）**: `src/types` の `FieldSummary`（11-04 本人承認）、`field-summary.ts` の `UnconfirmedPhotoRow` と `summarizeFields` の空の実装、`worker/fields.ts` の `getFieldsSummary` の空の実装、`routes.ts` の配線（表の末尾）
- **関数**: `summarizeFields(fieldIds, events: StatusEvent[], unconfirmed: UnconfirmedPhotoRow[]): FieldSummary[]`（純粋関数）、`getFieldsSummary: Handler`
- **合格条件**:
  - 本文は `json(200, { fields })`。圃場と順は `[...deps.knownFieldIds]`
  - `latest` は取り消していない判断のうち `at` が新しいもの、同じなら id の大きい方。無ければ null。判断の行は全部 `statusEventFromRow` を通す（列は `STATUS_EVENT_COLUMNS`、`*` を使わない）。壊れた行は 500（握らない）
  - `hasUnconfirmed` は、`state = 'unconfirmed'` の写真の候補（全部）か委員が選んだ番号に含まれるか（本人承認の A）。番号は完全に一致するときだけ。候補の列が壊れた未確定の写真は 500、確定済みの写真の候補は読まない
  - 一覧に無い番号の判断・写真は返さない
  - 認証なし（Cookie を読まない）。D1 を書き換えない。`console`・`Date`・`crypto`・R2・`newId`・`nowMs` を使わない。`cache-control` を触らない
- **決めたこと（本人、11-04、先輩経由で対面）**: 返す形 `{ fields: [{ fieldId, latest, hasUnconfirmed }] }`、最新の決め方、印は候補（最大3）か委員の番号（A）
- **RED の確かめ（11-04）**: 空の実装で 37 件が失敗・10 件が成功（経路の表・500・405）。仮の実装で 47 件と src・worker の 1116 件が通り、檻の純粋さの検査も通ることを確かめてから空に戻した。攻撃役の後の 63 件も、同じ仮の実装で通ることを確かめた
- **攻撃役（Sonnet、檻の中、仕様・決まりのファイルを消した複製で。文面に「素直な実装を先に書かない」を足した）**:
  - 1 回目（12 手、$0.15）: 47 件を、Worker で判断の行を `statusEventFromRow` に通さず `JSON.parse` だけで写す手抜きで通した。JSON として正しい非配列が 200 で素通り。6 件を足した
  - 2 回目（13 手、$0.15）: 53 件を、判断も候補も先頭の 1 行だけ検査する手抜きで通した。壊れた行を 2 行目以降に置くテスト 9 件と、確定済みの写真の候補を読まないテスト 1 件を足した
  - 3 回目（11 手、$0.13）: 63 件を通せたのは、仕様の外の点だけ（下）
  - 入れなかった指摘: 取り消し済みの壊れた行（読まなくてよい。500 にも 200 にも縛らない）。`at` の書き方の違い（`toISOString()` だけが書く。T23）。`chosen_field_id`・`state` の型（表の型と CHECK）。数百行の負荷（12 圃場の規模）
- **書き方の注意（`scripts/cage/policy.mjs`）**: import は Service が `@/types`、worker が `@/services/...`・`./...`。`Response.json()` を使わず `http.ts` の `json()`
- **参照**: `docs/spec.md` §6
- **担当**: 先輩

## T06 `photo-groups.ts`（圃場ページの写真を撮影日ごとにまとめる。L1）
- **状態**: 検査済み・人の確認待ち（11-04）
- **運転の記録（檻リレー v0.6、本人の PC で初めての列車、11-04）**: 進行役 `scripts/relay/run-day.mjs` が T06 → T12 の 1 本の列車として起動（本人のセッションの背景から。通知係は使わず）。START `551bfb1` → GREEN `bc31522` → REPORT `a3af2ea`。モデル Opus 5.5、`claude -p`、道具は檻の5つだけ、8 手、$0.39。ゲート G0〜G7 と C1〜C5 がすべて合格。変更は許可した1ファイルと REPORT だけ。QUESTIONS なし。RED は凍結・攻撃役の後（列車の前に `.dev.vars` を退避し、`wrangler logout`）
- **人の確認（Claude、11-04）**: 差分を読んだ（確定済みで番号が一致する写真を絞り、送った時刻・id の降順に並べてから撮影日ごとにまとめ、枠を撮影日の新しい順・null を最後に並べる）。worktree で `npm run check` を回し直して合格。実装を 11 通りに壊して 11 通りとも落ちる（state を見ない・委員の選んだ番号で選ぶ・送った時刻を古い順・id で決めない・id を小さい順・日付不明を先に・日付を古い順・元の配列を並べ替える・写しを作る・枠に項目を足す・日付で枠を分けない）
- **運転の予定**: 11-04、檻リレー（ハーネス v0.6。Service だけのパケット、11-03 決定①）
- **依存**: なし（`@/types` の `UploadedPhoto` だけ）
- **変えてよいファイル**: `src/services/photo-groups.ts` のみ（＋ `docs/run/REPORT-T06.md`、止まったときは `docs/run/QUESTIONS.md`）
- **テスト（凍結）**: `src/services/photo-groups.test.ts`（15 件）
- **人が RED で置いたもの**: `PhotoGroup` の型（`takenAt: string | null`・`photos: UploadedPhoto[]`）と空の関数 `groupFieldPhotos(photos, fieldId)`。共有ファイルは変えていない
- **RED の確かめ**: 13 件すべてが not implemented で落ちる。仮の実装で 13 件が通り、檻の純粋関数の検査も通ることを確かめてから空に戻した。lint・型・安全検査はそれぞれ単独で通る。攻撃役の後の 15 件も、空の実装で全件が落ち、仮の実装で全件が通り、純粋関数の検査も通る（11-04）
- **攻撃役（Sonnet、檻の中、仕様・決まりのファイルを消し、空の実装の説明を除いた複製で。11-04）**:
  - 1 回目（5 手、$0.06）: 13 件を全部通す手抜きが書けた。圃場の番号を引数で見ず `"A-06"` に決め打ち。2 件を足した（混ざった入力を番号を変えて呼ぶ、確定の番号が違えば委員の選んだ番号が同じでも出さない）
  - 2 回目（5 手、$0.05）: 15 件を通す意味のある手抜きは書けず、ほぼ正しい実装になった
  - 入れなかった指摘: 送った時刻・撮影日の形の違い（`+09:00`・ミリ秒なし・`2026-7-1`）は、サーバーが 1 つの形（ISO の `Z`・`YYYY-MM-DD`）でしか書かないので起きない。T22 の SQL も文字列で並べるので、文字列で比べるのが同じ並び／id の桁の違い（`p9` と `p10`）は、id が `crypto.randomUUID()` で桁が同じなので起きない
- **並び（11-03 本人決定）**: 撮影日の新しい日が先、日付不明（`takenAt: null`）はいちばん後ろの別枠。同じ日の中は送った時刻（`uploadedAt`）の新しい順、同じ時刻なら id の大きい順
- **合格条件**:
  - 出すのは `state === "confirmed"` かつ `fieldId === 引数` の写真だけ（完全一致。大文字小文字・空白を区別）。未確定は、候補・委員が選んだ番号・矛盾した `fieldId` があっても出さない
  - 同じ撮影日は 1 つの枠。空の枠を作らない。該当が無ければ `[]`
  - 枠の項目は `takenAt` と `photos` の 2 つだけ。写真はそのままのものを入れる（写しを作らない）。元の配列と写真は変えない
  - 例外を出さない。`console`・`Date`・`crypto` を使わない
- **書き方の注意（`scripts/cage/policy.mjs`）**: import は `@/types` だけ

## T12 `status-reason.ts`（判断と理由・根拠の入力の検証。L1）
- **状態**: 検査済み・人の確認待ち（11-04）
- **運転の記録（檻リレー v0.6、本人の PC で初めての列車、11-04）**: T06 に続く 2 本目。START `763599f` → GREEN `85018aa` → REPORT `092aa67`。モデル Opus 5.5、`claude -p`、道具は檻の5つだけ、9 手、$0.43。ゲート G0〜G7 と C1〜C5 がすべて合格。変更は許可した1ファイルと REPORT だけ。QUESTIONS なし。`src/config.ts` の変更は凍結の前に先輩の確認済み
- **人の確認（Claude、11-04）**: 差分を読んだ（キー → status → reasons → note → refPhotoIds の順に見て最初の誤りを返す。上限と選択肢は config から読む）。worktree で `npm run check` を回し直して合格。実装を 19 通りに壊して 19 通りとも落ちる（配列を通す・知らないキー・done を拒む・理由の型・選択肢・大文字小文字・理由の重なり・メモの型・空白を除かない・UTF-16 で数える・上限の 1 ずれ・除く前の長さ・空のメモ・空文字の写真 id・写真の上限の 1 ずれ・写真の重なり・確定済みかを見ない・入力の配列を返す・config の直書き）
- **運転の予定**: 11-04、檻リレー（ハーネス v0.6。Service だけのパケット、11-03 決定①）
- **依存**: なし（`@/types` の `StatusEvent`、`src/config.ts` の定数）
- **変えてよいファイル**: `src/services/status-reason.ts` のみ（＋ `docs/run/REPORT-T12.md`、止まったときは `docs/run/QUESTIONS.md`）
- **テスト（凍結）**: `src/services/status-reason.test.ts`（52 件）・`src/services/status-reason-config.test.ts`（3 件、設定を差し替えて上限と選択肢に従うかを見る）
- **人が RED で置いたもの**: `src/config.ts`（共有ファイル。11-04 先輩の確認済み）の `STATUS_REASONS` を P21 の答えの 5 つに（穂の色・黄色い穂の割合・農協の判定で中止（水分超過）・同（砕けなどの傷）・その他、この順）、`STATUS_REF_PHOTOS_MAX = 5`、`STATUS_NOTE_MAX_CHARS` のコメント。`src/config.test.ts` に 2 件。`status-reason.ts` の型（`StatusInputReason`・`StatusInput`・`StatusInputResult`）と空の関数 `parseStatusInput(body, confirmedPhotoIds)`
- **RED の確かめ**: 41 件すべてが not implemented で落ちる。仮の実装で 41 件が通り、檻の純粋関数の検査も通ることを確かめてから空に戻した。lint・型・安全検査はそれぞれ単独で通る。攻撃役の後の 55 件も、空の実装で全件が落ち、仮の実装で全件が通り、純粋関数の検査も通る（11-04）
- **攻撃役（Sonnet、檻の中、仕様・決まりのファイルを消し、空の実装の説明を除いた複製で。11-04）**:
  - 1 回目（6 手、$0.08）: 41 件を全部通す手抜きが書けた。使った手抜きは config の値（200 字・5 枚・選択肢の 5 つ）の直書き。設定を差し替える別のファイル（3 件）と、境目（status が null・数値、理由が空文字・前後に空白、メモが空文字・全角の空白やタブだけ、絵文字と普通の字が混ざった 200／201 字）の 6 件を足して 50 件
  - 2 回目（8 手、$0.13）: 50 件を全部通す手抜きが書けた。重なりを先頭と末尾だけで比べる。重なる位置を変えた 4 件（理由・写真）と、キーが 4 つ以下でも知らないキーがある 1 件を足して 55 件
  - 3 回目（5 手、$0.07）: 手抜きの余地が無く、ほぼ正しい実装になった
  - 入れなかった指摘: 誤りが 2 つ以上あるときに返す理由の順（仕様に無い。どれも 422）／`Object.create(null)`・Proxy・疎配列（本文は `JSON.parse` から来るので起きない）／NBSP・ゼロ幅の空白（`trim()` に従う）／書記素で数える（コードポイントで数えると決めてある、`src/config.ts`）／必須キーが無い場合（`undefined` の行で確かめている）
- **決まり（11-03 本人決定）**: 「その他」でもメモは任意／理由 0 個は許す（「記録なし」）／根拠の写真は 5 枚まで／同じ理由・同じ写真の二重は拒否。全角の空白だけのメモも null（11-04 本人決定）
- **合格条件**:
  - 入力は JSON を読んだ後の値。オブジェクトでなければ `not_object`、キーは `status`・`reasons`・`note`・`refPhotoIds` だけ（`__proto__` も数える）
  - `status` は `ready`・`done` だけ。`reasons` は文字列の配列で、選択肢のコードと完全一致・重ねない。`note` は無い・null・文字列（前後の空白を除き、空なら null、コードポイントで 200 字まで、改行は残す）。`refPhotoIds` は空でない文字列の配列で、5 枚まで・重ねない・`confirmedPhotoIds` にあるものだけ（完全一致）
  - 返す値は 4 つの項目だけで、配列は入力の順を保った写し。元の入力を変えない。例外を出さない
- **書き方の注意（`scripts/cage/policy.mjs`）**: import は `@/types`・`../config` だけ
- **担当**: 本人

## T25 `POST /api/fields/:id/status`（判断と理由・根拠を残す。委員以上、L1）
- **状態**: 検査済み・人の確認待ち（11-04）
- **運転の記録（1104 の列車の 3 本目、`--skip T23 --skip T24`）**: START `d18e0fa` → GREEN `b828aab` → REPORT `b3f684c`。モデル Opus、`claude -p`、道具は檻の5つだけ、18 手、$0.67。ゲート G0〜G7 は green。変更は許可した 2 ファイルだけ。QUESTIONS なし。C1〜C5 合格（C3 105 件、C4 テスト全体 1649 件、lint エラー 0・警告 2）。REPORT に手元のパスなし。watch.mjs の「列車終了: GREEN 3／ask 0／stopped 0、$1.70」をこのセッションから PushNotification でスマホに送った。本体に `.dev.vars` は無かった（退避するものなし）
- **Claude の確認（11-04、人の確認の前）**: 実装を 12 通りに壊して 12 通りとも落ちる（確定済みの条件を外す 1・圃場の条件を外す 33・圃場の一覧を見ない 5・Content-Type を見ない 6・申告の長さを見ない 1・上限を 2 倍に 2・端末を固定 1・時刻を固定 1・理由を JSON にしない 17・400 を 422 に 3・T12 に任せない 68・JSON の失敗を 422 に 8）。手元の `wrangler dev`（使い捨ての値と D1）で、Cookie なし 401、委員で 201 と 9 項目、未確定の写真・別の圃場の写真を根拠にすると 422 `ref_photo_not_in_field`、Z-99 は 422 `unknown_field`、JSON でない 400、text/plain 415、知らない理由 422 `unknown_reason`、3000 バイトは 413、すべて no-store。残した判断が `GET /api/fields/summary` の latest になり、T23 で取り消すと null に戻った。UTF-8 のファイルから送ったメモ（絵文字入り）は前後の空白を除いてそのまま残った（シェルの引数で送ると文字化けしたが、Git Bash の引数の文字コードのせいで API ではない）
- **人の確認**: まだ（先輩が差分を読んでからマージ。CLAUDE.md の無人運転の PR の例外）
- **Issue**: #91
- **依存**: T12（`parseStatusInput`、本人、#96）、T23（`STATUS_EVENT_COLUMNS`・`statusEventFromRow`）、T11、T18、T19（`body.ts`・`isJsonContentType`）
- **変えてよいファイル**: `src/services/status-request.ts`・`worker/field-status.ts`（＋ `docs/run/REPORT-T25.md`、止まったときは `docs/run/QUESTIONS.md`）
- **テスト（凍結）**: `src/services/status-request.test.ts`・`src/services/status-request-delegate.test.ts`（`parseStatusInput` を差し替えて任せていることを確かめる）・`worker/field-status.test.ts`・`worker/routes.test.ts`（POST の経路を足した）
- **人が RED で置いたもの（凍結）**: `status-request.ts` の `STATUS_BODY_MAX_BYTES`（2048）・`StatusBodyResult` と `parseStatusBody` の空の実装、`worker/field-status.ts` の `postFieldStatus` の空の実装、`routes.ts` の配線（表の末尾）
- **関数**: `parseStatusBody(text: string, confirmedPhotoIds: ReadonlySet<string>): StatusBodyResult`（JSON でなければ 400、読めたら `parseStatusInput` に任せて 422 と理由）、`postFieldStatus: Handler`
- **合格条件**:
  - Content-Type が JSON でなければ 415（`isJsonContentType`）。申告・実際の長さが 2048 バイトを超えれば 413（`declaredTooLarge`・`readBodyLimited`）
  - 経路の `:id` が `deps.knownFieldIds` に無ければ 422 `{ error: "unprocessable", reason: "unknown_field" }` で、D1 を触らない
  - 根拠の判定に渡す集合は、その圃場で `state = 'confirmed'` の写真の id（値は bind）。中身の誤りは 422 と T12 の理由のコード、JSON でなければ 400 `{ error: "bad_request" }`。どちらも行を足さない
  - 通れば `field_status_events` に 1 行（理由・根拠は JSON の配列、メモは T12 が整えた値、端末は Cookie の端末、時刻は `deps.nowMs`）。`RETURNING` の行を `statusEventFromRow` で写して 201
  - `console`・`Date.now`・`crypto`・R2・`newId` を使わない。`cache-control` を触らない
- **決めたこと（先輩、11-04）**: 成功の本文は残した `StatusEvent`。一覧に無い圃場は 404 ではなく 422 `unknown_field`（T22 と同じく spec §6 の誤りの欄に合わせる）。JSON でない本文は 400、Content-Type 415、大きすぎる 413（PATCH assignment と同じ）。本文の上限 2048 バイト（メモ 200 字×4 バイト・理由 5 つ・UUID 5 枚が収まる）
- **RED の確かめ（11-04）**: 空の実装で 49 件が失敗・11 件が成功（経路の表・401・500・405・上限の大きさ）。仮の実装で、攻撃役の後の 105 件と src・worker の全件が通り、檻の純粋さの検査も通ることを確かめた
- **攻撃役（Sonnet、檻の中、仕様・決まりのファイルを消した複製で。文面に「素直な実装を先に書かない」）**:
  - 1 回目（19 手、$0.27）: 60 件を、`parseStatusInput` を呼ばずテストの値（`"maybe"`・201 字・6 枚など）だけ見る手抜き、SQL から `state = 'confirmed'` を外す手抜き、Content-Type の完全一致で通した。`parseStatusInput` と同じ結果になるかを 28 の入力で比べるテスト、番号入りの未確定の写真、`charset` 付き、1 バイトずつのチャンク、`duplicate_ref_photo` を足した
  - 2 回目（17 手、$0.23）: 93 件を、検証を手で写す（字数を空白を除く前に数える誤り付き）手抜きで通した。`parseStatusInput` を差し替えて呼ばれることを確かめる別のファイル、空白付きの長いメモ、JSON でない Content-Type 5 つを足した
  - 3 回目（17 手、$0.20）: 102 件を、ほぼ素直な実装で通した。残りは境目だけだったので、上限ちょうど・1 バイト超え、`;` の前の空白、Content-Type 無しを足して凍結した
  - 入れなかった指摘: `content-length` が `abc`・負・小数（`declaredTooLarge` が読めなければ本文で判定する。T19 で確かめ済み）。誤りが重なったときの順序（仕様に無い）。根拠が空のときに D1 を引かないこと（性能。12 圃場の規模）。INSERT が行を返さない場合（D1 の RETURNING は必ず返す）。同じ要求を 2 回（続けて残すテストで別の行になる）
- **書き方の注意（`scripts/cage/policy.mjs`）**: import は Service が `./status-reason`・`@/types`、worker が `@/services/...`・`./...`。`Response.json()` を使わず `http.ts` の `json()`・`errorResponse()`
- **参照**: `docs/spec.md` §6
- **担当**: 先輩

## T26 `GET /api/fields/:id/status-events`（圃場ページの判断の履歴。認証なし、L1）
- **状態**: 検査済み・人の確認待ち（11-04）
- **運転の記録（1104 の列車の 4 本目、`--skip T23 --skip T24 --skip T25`）**: START `b1872ed` → GREEN `d83b7b2` → REPORT `7751d66`。モデル Opus、`claude -p`、道具は檻の5つだけ、11 手、$0.52。ゲート G0〜G7 は green。変更は許可した 1 ファイルだけ。QUESTIONS なし。C1〜C5 合格（C3 35 件、C4 テスト全体 1682 件、lint エラー 0・警告 2）。REPORT に手元のパスなし。SQL で並べ、列は `STATUS_EVENT_COLUMNS`（3 回目の攻撃役の残りも合格条件どおり）。この日の 1 日の上限は $3 から $4 に上げた（週次 21%、この日の上限 33%）
- **Claude の確認（11-04、人の確認の前）**: 実装を 9 通りに壊して 9 通りとも落ちる（圃場の一覧を見ない 5・WHERE を外す 16・at の昇順 4・id の昇順 1・at だけで並べる 1・取り消しを除く 3・上限 200 が 1・行を写さない 8・404 を 400 に 5）。手元の `wrangler dev`（使い捨ての値と D1）で、判断なしは 200 `[]`・no-store、T25 で A-06 に 3 件・A-07 に 1 件残し T23 で 2 番を取り消すと、Cookie なしで A-06 の 3 件だけが 3・2（取り消し）・1 の順に 9 項目ずつ、Z-99 は 404、POST は 405 Allow: GET
- **人の確認**: まだ（先輩が差分を読んでからマージ。CLAUDE.md の無人運転の PR の例外）
- **Issue**: #99（本人が見つけた設計の抜け）
- **依存**: T23（`STATUS_EVENT_COLUMNS`・`statusEventFromRow`）、T11、T18
- **変えてよいファイル**: `worker/status-history.ts`（＋ `docs/run/REPORT-T26.md`、止まったときは `docs/run/QUESTIONS.md`）
- **テスト（凍結）**: `worker/status-history.test.ts`・`worker/status-history-delegate.test.ts`（`statusEventFromRow` を差し替えて全行が通ることを確かめる）・`worker/routes.test.ts`（GET の経路を足した）
- **人が RED で置いたもの（凍結）**: `worker/status-history.ts` の `getFieldStatusEvents` の空の実装、`routes.ts` の配線（表の末尾）
- **関数**: `getFieldStatusEvents: Handler`
- **合格条件**:
  - `:id` が `deps.knownFieldIds` に無ければ 404 `{ error: "not_found" }` で、D1 を触らない
  - SQL は 1 文。`SELECT <STATUS_EVENT_COLUMNS> FROM field_status_events WHERE field_id = ? ORDER BY at DESC, id DESC`（`*` を使わない、列は `STATUS_EVENT_COLUMNS`、並べ替えは SQL で行い JS で並べ替えない、番号は bind）。上限を付けない
  - 取り消したものも含めて全行を `statusEventFromRow` に通し、`json(200, …)`。壊れた行は 500（握らない）
  - 認証なし（Cookie を読まない）。D1 を書き換えない。`console`・`Date`・`crypto`・R2・`newId`・`nowMs` を使わない。`cache-control` を触らない
- **決めたこと（先輩、11-04、#99）**: 端末 ID は返す（`docs/privacy.md` に書き足した）。一覧に無い圃場は 404。件数の上限は付けない
- **RED の確かめ（11-04）**: 空の実装で 17 件が失敗。仮の実装で、攻撃役の後の 35 件と src・worker の全件が通り、檻の純粋さの検査も通ることを確かめた
- **攻撃役（Sonnet、檻の中、仕様・決まりのファイルを消した複製で。文面に「素直な実装を先に書かない」）**:
  - 1 回目（10 手、$0.11）: 31 件を、番号を SQL に文字列で埋め込む・`LIMIT 1000` の決め打ち・理由の要素の型を見ない手抜きで通した。引用符を含む番号（`A-06'--`）、1200 件、理由が `[1]` の行を足した
  - 2 回目（8 手、$0.08）: 33 件を、全件を読んで JS で絞り・並べ、行の写しを自前で書く手抜きで通した。D1 を包んで SQL 1 文・bind・読んだ行数を確かめるテストと、`statusEventFromRow` を差し替える別のファイルを足した
  - 3 回目（10 手、$0.10）: 35 件を、列名の直書きと JS での並べ替えで通した。どちらも結果が同じなので、テストにせず合格条件に書いた（無人の GREEN の後に人が差分で確かめる）
  - 入れなかった指摘: `status`・`note`・`actor_device` の型の検査（表の型と CHECK。T23・T24 と同じ）。`at` の書き方の違い（`toISOString()` だけが書く）。クエリ文字列の `id`（経路の `:id` だけを読む）
- **書き方の注意（`scripts/cage/policy.mjs`）**: import は `@/services/...`・`./...`。`Response.json()` を使わず `http.ts` の `json()`・`errorResponse()`
- **参照**: `docs/spec.md` §6、`docs/privacy.md`
- **担当**: 先輩

## T29 `0002_handover` と `GET /api/fields/:id/handover`（L6 の引き継ぎメモを読む。認証なし）
- **状態**: 検査済み・人の確認待ち（11-04）
- **運転の記録（1104 の列車の 7 本目、`--skip T23〜T28`）**: START `3ccbb93` → GREEN `809599f` → REPORT `dcfc818`。モデル Opus、道具は檻の5つだけ、15 手、$0.66。ゲートは green。変更は許可した 2 ファイルだけ。QUESTIONS なし。C1〜C5 合格（C3 104 件、C4 テスト全体 1816 件）。REPORT に手元のパスなし
- **Claude の確認（11-04、人の確認の前）**: 差分を読んで抜けは見つからなかった。実装を 16 通りに壊して 14 通りが落ちた。残った 2 通りはテストの穴: (1) 記録の壊れ方のテストが元のメモの blocks（2 件目を引用）を残していて、どれも「引用の範囲の外」で例外になっていた（`kind`・`id` の検査を外しても通る）→ blocks を空にした 16 件に直した、(2) どのテストの時刻も日本時間で 2026 年で、シーズンを固定しても通った → 2027 年の時刻のテストを足した。直した後は 16 通りとも落ちる。手元の `wrangler d1 migrations apply --local` で 0001・0002 が流れ、壊れた JSON の body は本物の D1 でも CHECK（json_valid）で入らない。手元の `wrangler dev`（使い捨ての値と D1）で、A-06（2026 のメモあり）は 200 で HandoverNote の 6 項目・no-store、A-07（メモなし）と Z-99 は 404、POST は 405 Allow: GET
- **人の確認**: まだ
- **Issue**: #106（L6 のサーバー側は先輩。11-04 本人と先輩の合意）
- **依存**: 共有の型 `HandoverNote`・`HandoverRecord`、T11（経路・`http.ts`）
- **変えてよいファイル**: `src/services/handover-note.ts`・`worker/handover.ts`（＋ `docs/run/REPORT-T29.md`、止まったときは `docs/run/QUESTIONS.md`）
- **テスト（凍結）**: `src/services/handover-note.test.ts`・`worker/handover.test.ts`・`worker/migrations-0002.test.ts`・`worker/routes.test.ts`（GET の経路を足した）
- **人が RED で置いたもの（凍結）**: `migrations/0002_handover.sql`（`handover_notes`、主キーは field_id と season、body は `json_valid`）、`handover-note.ts` の `HANDOVER_NOTE_COLUMNS`・`HandoverNoteRow` と空の関数、`handover.ts` の空のハンドラ、`routes.ts` の配線（表の末尾）
- **関数**: `handoverSeason(nowMs): string`、`handoverNoteFromRow(row): HandoverNote`、`getFieldHandover: Handler`
- **合格条件**:
  - `handoverSeason`: 日本時間の年（どの年でも元日の 0 時で変わる。表を持たない）
  - `handoverNoteFromRow`: 5 つの列はすべて文字列。body は JSON の `{ records, blocks }`。record は `kind` が `status`・`photo` のどちらか、`id`・`text` は文字列。block は `text` が文字列、`cites` が配列。cite は `start`・`end` が整数で `0 <= start < end <= records の数`、`citedText` が文字列。余分な項目は写さない。どれかが違えば例外で、メッセージに `handover_notes` を含み、body の中身を入れない
  - `getFieldHandover`: `:id` が `deps.knownFieldIds` に無ければ 404 `{ error: "not_found" }` で D1 を触らない。SQL は 1 文 `SELECT <HANDOVER_NOTE_COLUMNS> FROM handover_notes WHERE field_id = ? AND season = ?`（`*` を使わない、番号とシーズンは bind、シーズンは `handoverSeason(deps.nowMs())`）。行が無ければ 404。あれば `json(200, handoverNoteFromRow(row))`。壊れた行は 500（握らない）
  - 認証なし（Cookie を読まない）。D1 を書き換えない。`console`・`crypto`・R2・`newId` を使わない。`cache-control` を触らない
- **決めたこと（先輩、11-04、#106）**: GET は今のシーズン（日本時間の年）のメモだけ。前のシーズンを読む口は作らない（要るようになったら `?season=` を足す）。settings の表は L8 のときに足す
- **RED の確かめ（11-04）**: 空の実装で 41 件が失敗（空でも通るのは表・経路の表・405）。仮の実装で、攻撃役の後の 104 件と src・worker の全件が通り、檻の純粋さの検査も通ることを確かめた
- **攻撃役（Sonnet、檻の中、仕様・決まりのファイルを消した複製で）**:
  - 1 回目（13 手、$0.14）: 59 件を、一覧を見ずに `A-NN` の形で判定・2 つの年の境目だけで場合分け・`field_id` の型と `end` が整数かを見ない手抜きで通した。形は合うが一覧に無い番号、`knownFieldIds` を差し替える、ほかの年、型の違う列・`end` を足した
  - 2 回目（15 手、$0.17）: 74 件を、2024〜2031 年の元日の表・テストに出る値だけを弾く手抜きで通した。1971〜2100 年の 8 つの年の元日の境、`kind`・`id`・`text`・`citedText`・cite・cites の型の違いを 22 通り足した
  - 入れなかった指摘: D1 が例外を投げたときの 500（共通の作り）、`created_at` の日付の正しさ・空の `model`（書くのはサーバーだけ）、例外のメッセージがどこが壊れたかを表すこと
- **書き方の注意（`scripts/cage/policy.mjs`）**: import は `@/services/...`・`@/types`・`./...`。`Response.json()` を使わず `http.ts` の `json()`・`errorResponse()`。`Date.now()` を使わず `deps.nowMs()`
- **参照**: `docs/spec.md` §5・§6
- **担当**: 先輩
