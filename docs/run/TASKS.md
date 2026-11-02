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
- **状態**: 予定
- **依存**: T00
- **変えてよいファイル**: `src/services/candidates.ts` のみ（＋ `docs/run/REPORT.md`、止まったときは `docs/run/QUESTIONS.md`）
- **テスト（凍結）**: `src/services/candidates.test.ts`。件数: RED のときに人が書く
- **RED で人が足すもの**: `src/types/`（`Field` は T00 で済み）、`src/config.ts` の `MAX_CANDIDATES`（T00 で済み）、空の実装 `throw new Error('not implemented')`、このパケット項目の件数
- **合格条件（テストにする）**:
  - 撮影位置（lat, lng）と圃場一覧から、近い順に圃場の **番号だけ** を返す（距離は返さない。K6）
  - 最大 N 件（既定 `MAX_CANDIDATES` = 3）
  - 位置が null なら空配列
  - 画面用の距離は別の関数で出す（この関数の戻り値には含めない）
  - 距離はハバーサイン（地球の半径は定数として `src/config.ts` に置かず、Service 内の定数でよい）
- **参照**: docs/spec.md「流れ（L0）」3、「データ契約」`Field`・`UploadedPhoto.candidateFieldIds`
