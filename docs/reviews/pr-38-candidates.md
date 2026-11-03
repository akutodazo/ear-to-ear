# PR #38 レビュー（T02 candidates）

## 対象
- PR: akutodazo/ear-to-ear#38「T02: candidates（RED は人、GREEN は無人運転の試験1）」 `run/1103-a` → `main`
- コミット: `eed9b9f` RED／`ecb262b` GREEN／`7583d66` REPORT／`7a0d1e0` 人の確認（HEAD）

## レビューした者
書いた会話を見ていない別の Claude Code のセッション（モデル: Claude Opus 5.5 `claude-opus-5-5`）。渡されたのは PR の番号と読み方だけ。読むだけで、ファイルの作成・変更・コミット・ブランチの切り替えはしていない。

## 読んだもの
- `AGENTS.md`、`docs/spec.md`、`docs/decisions.md`（K6・K10・P15）、`docs/run/TASKS.md`、`docs/run/REPORT.md`
- `src/types/index.ts`、`src/config.ts`（`MAX_CANDIDATES`）、`vitest.config.ts`
- `git diff main...run/1103-a`、`git log main..run/1103-a`、RED の時点の `src/services/candidates.ts`（`git show eed9b9f:…`）
- PR の本文（GitHub の PR ページをブラウザで読んだ）

## 結論
**マージを止める問題は無い。** テストは spec §9 の candidates の行（近い順の番号だけ・最大 N／null なら空／画面用の距離は別の関数）を満たしている。実装は純粋関数で、距離を戻り値に含めない（K6）。テストの座標はすべて P15 の範囲の中（K10）。凍結ファイルの変更も無い。指摘は低2件・軽微2件。

## 指摘
| # | 重さ | 内容 | 勧める対応 |
|---|---|---|---|
| 1 | 低 | `LatLng` が `src/services/candidates.ts` で定義されている。AGENTS.md §4 の層の決まりでは、型の置き場所は `src/types/`。本文によると人の判断で共有ファイルに置いていない。ただ T01 `photo-meta` が撮影位置を返すときに、Service どうしで import するか、同じ型を二重に書くことになる | T01 の RED までに、`src/types/` へ移すか（両方の承認が要る）、今の置き場所でよい理由を decisions か TASKS に1行書く |
| 2 | 低 | 緯度・経度に NaN が来ると比較関数が矛盾し、候補が不定の順で返る（空配列にならない）。本文の弱点候補に書かれており、T01 で null にする前提 | 今は対応不要。T01 のテストに「0/0（NaN）は null」がある（spec §9）ことを、T01 の RED で確かめる。念のため `Number.isFinite` で弾いて `[]` を返す手もある（その場合は先にテストを足す） |
| 3 | 軽微 | テストの座標に P15 の範囲のちょうど端（北緯 41.8・東経 144.5）が入っている。T17 の安全検査が範囲を「端を含まない」で比べると誤って検出する | T17 で範囲を端を含めて比べる（`>=`・`<=`）。または T17 のテストに端の値を入れる |
| 4 | 軽微 | 本文の表では RED（`eed9b9f`）と人の確認（`7a0d1e0`）を「人」としているが、どちらのコミットにも `Co-Authored-By: Claude` が付いている。「作成」欄の「RED は人と Claude の対話」とは合っているが、表だけ読むと食い違って見える。TASKS の状態「人の確認済み」は、TASKS の冒頭に書かれた状態の言葉（予定 → … → 取り込み済み／止まった）に無い | 表を「人（Claude との対話）」にする。状態の言葉を冒頭の一覧に足すか、一覧の言葉に合わせる |

## 決まりとの照合
| 決まり | 結果 | 根拠 |
|---|---|---|
| K6 撮影位置を外に出さない | ○ | `candidateFieldIds` の戻り値は `string[]`（番号だけ）。fetch や保存は無い。`distanceMeters` は画面用として別の関数。距離を送らないことは、後で画面と `upload-meta` の側で守る |
| K10 実データを入れない | ○ | テストの座標は北緯 41.8〜41.812・東経 144.5〜144.517 で、P15 の四角の中。番号は `A-xx`。画像・CSV は増えていない（変わったのは4ファイル） |
| 秘密を入れない | ○ | 差分に合言葉・キー・`.dev.vars` は無い |
| 層の決まり（Service は純粋関数） | ○（#1 を除く） | ブラウザ API・React・fetch に依存しない。定数 `MAX_CANDIDATES` は config から取っている。地球の半径を Service に置くのは TASKS で許されている |
| RED と GREEN は別のコミット | ○ | `eed9b9f`（テスト＋空の実装）と `ecb262b`（`candidates.ts` だけ） |
| 凍結ファイル（無人運転） | ○ | `git diff --name-only eed9b9f..run/1103-a` は `docs/run/REPORT.md`、`docs/run/TASKS.md`、`src/services/candidates.ts` だけ。TASKS は運転の後に人が変えた（`7a0d1e0`） |
| `toThrow()` を引数なしで使わない | ○（該当なし） | 例外のテストは無い |
| `any`・`@ts-ignore`・`eslint-disable` を使わない | ○ | 差分に無い |
| 本文と差分の一致 | ○（#4 を除く） | 変更内容・`slice(0, Math.max(0, max))`・半径 6,371,000m・asin の前で 1 に丸める処理・弱点候補が、差分と合っている |

## 確かめたこと
- `git rev-parse --short HEAD` → `7a0d1e0`（本文の「最終の HEAD」、GitHub のコミット一覧と同じ）
- `npx vitest run src/services/candidates.test.ts` → `Tests 13 passed (13)`
- `npx eslint src/services/candidates.ts src/services/candidates.test.ts` → 終了コード 0
- `npx tsc --noEmit` → 終了コード 0
- 上の後の `git status --porcelain --untracked-files=all` → 出力なし
- `git show --stat ecb262b` → `src/services/candidates.ts` だけ
- RED の空の実装（`git show eed9b9f:src/services/candidates.ts`）は両方の関数で `throw new Error("not implemented")`。13件のテストはどれもこのどちらかを呼ぶので、RED では全部落ちる（読んで確かめた。実際に RED を回してはいない）
- **テストが誤った実装を捕まえられるか**: テストの期待値を写した使い捨てのスクリプト（リポジトリの外の作業用フォルダ）で、正しい実装と誤った実装9通りを比べた

  | 実装 | 結果 |
  |---|---|
  | 正しい実装（PR と同じ考え方） | 全部通る |
  | 度の差のままユークリッド距離 | 落ちる（経度・東83m） |
  | 地球の半径 6,378,137m | 落ちる（北111m・東83m） |
  | cos に度のまま渡す | 落ちる（東83m） |
  | 同じ距離のとき並べ替えない／降順 | 落ちる（同距離） |
  | 引数の配列を並べ替える | 落ちる（凍結した配列で例外） |
  | 件数の引数を無視 | 落ちる（件数1） |
  | 遠い順 | 落ちる（6件） |
  | 正距円筒の近似 | 全部通る（1.7km 四方では差が 0.05m 未満。仕様の「ハバーサイン」とは違うが、実用上の問題は無い） |

- テストのコメントの距離（約445m・約111m・約99m・約83m）を計算して合っていることを確かめた

### 確かめていないこと
- `npm run check` 全体（安全検査・build）は回していない。build・typegen がファイルを作るため。本文と REPORT に人の回し直しで終了コード 0 とあるが、私は見ていない
- GitHub の CI（`check`）の結果は見ていない
- 無人運転の準備（push 先の無効化・pre-push フック・`ls-remote` の比較）は、本文に書かれているだけで、私は確かめていない
- Issue #10 の中身は読んでいない（PR ページに出るタイトルだけ見た）

## 指摘への対応（書いた側、11-03）
| # | 対応 |
|---|---|
| 1 | 今は移さない。T01 の RED で撮影位置の型が要るときに `src/types/` へ移すかを決める（共有ファイルなので先輩の承認と一緒に）。`docs/run/TASKS.md` の T02 に1行残した |
| 2 | 今は対応しない。T01 の RED で「0/0（NaN）は null」のテストがあることを確かめる（TASKS に1行） |
| 3 | 対応済み。T17 の RED（未マージ）は範囲を端を含めて比べ、端の値（41.8・144.5／41.815・144.52）をテストに入れている |
| 4 | PR の本文の表を「人（Claude との対話）」に直した。TASKS の状態は冒頭の一覧の言葉「取り込み済み」に合わせた |
