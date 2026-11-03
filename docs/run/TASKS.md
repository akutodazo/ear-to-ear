# パケットの一覧（無人運転用）

本人の無人運転（`/goal`）に渡す作業単位。先輩は見るだけでよい。
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
| 7 | T04 `upload-meta.ts` | 先輩 | — |
| 8 | T11 `0001_init.sql` | 先輩（対話） | — |
| 9 | T08 保存の失敗 | 先輩 | — |
| 10 | T09・T10 架空圃場・合成写真 | 本人（対話） | — |
| 11 | T06 `photo-groups.ts`（L1） | 本人 | 可 |
| 12 | T12 `status-reason.ts`（L1） | 本人 | 可 |
| 13〜 | T07・T13・T14・T15・T16（L6・L8） | L0 の後に決める | — |

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
