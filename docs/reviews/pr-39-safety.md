# PR #39 レビュー（T17 安全検査の中身）

## 対象
- PR: akutodazo/ear-to-ear#39「T17: 安全検査の中身（デモの JPEG・圃場の座標・秘密らしい文字列）」 `t17-safety` → `main`
- コミット: `1141a39` RED／`cc5039d` GREEN／`f61d68c` 配線／`0afd9d9` 文書（HEAD）

## レビューした者
書いた会話を見ていない別の Claude Code のセッション（モデル: Claude Opus 5.5 `claude-opus-5-5`）。渡されたのは PR の番号と読み方だけ。読むだけで、リポジトリのファイルの作成・変更・コミット・ブランチの切り替えはしていない（試しはリポジトリの外の作業用フォルダで行った）。

## 読んだもの
- `AGENTS.md`、`docs/spec.md`、`docs/decisions.md`、`docs/privacy.md`、`docs/run/TASKS.md`（T17）
- `src/config.ts`、`src/types/index.ts`（`Field`）、`src/services/jpeg-segments.ts`、`package.json`、`vitest.config.ts`、`tsconfig.json`、`eslint.config.mjs`、`.gitignore`、`.github/workflows/check.yml`
- `git diff main...t17-safety`、`git log main..t17-safety`、RED の時点の `scripts/safety-rules.ts`（`git show 1141a39:…`）
- PR の本文（`gh pr view 39`）
- 前のレビュー `docs/reviews/pr-38-candidates.md`（書き方を合わせるため）

## 結論
**マージを止める問題は無い。** 4つの判定は TASKS の合格条件どおりに動き、検査の出力に秘密の値は出ない（実際に確かめた）。純粋関数と配線の分け方も層の決まりに合っている。ただし**中が4件**ある。特に #1（AGENTS.md §1-5「画像ファイルをコミットしない」と、今回 `public/demo/` の JPEG を許したことの食い違い）と #2（範囲の下限・上限の片方を消してもテストが全部通る）は、`src/config.ts` の先輩の確認を待つ間に、この PR の中で直すことを勧める。

## 指摘
| # | 重さ | 内容 | 勧める対応 |
|---|---|---|---|
| 1 | 中 | AGENTS.md §1-5（絶対に守ること）は「画像ファイルをコミットしない」のまま。この PR で検査は `public/demo/` の JPEG を通すようになった（decisions 11-03 の本人決定）が、AGENTS.md は変わっていない。Codex・先輩は AGENTS.md を読むので、決まりと検査が食い違う。また、検査が確かめるのは「メタデータが無いこと」だけで、「実写真でないこと」ではない（実写真を縮小・再エンコードすれば通る）。K10 は人の目で守るしかない | AGENTS.md §1-5 を「画像は `public/demo/` の JPEG だけ。架空・期間中に作ったもの・メタデータなし（検査あり）。実写真かどうかは検査では分からないので人が確かめる」に直す（共有ファイルなので両方の承認）。PR 本文の「同時に更新した文書」にも書く |
| 2 | 中 | `checkFieldsArea` のテストは「緯度が上限の外」と「経度が下限の外」しか無い。実装から `lng <= area.lngMax` や `lat >= area.latMin` を消しても 46 件すべて通る（変異テストで確かめた）。安全検査の判定が壊れてもテストで気づけない | 「緯度が下限の外（例 41.79）」「経度が上限の外（例 144.53）」の2件を足す（RED のコミットを分ける） |
| 3 | 中 | 秘密の検査が UTF-16 の文字ファイルをすり抜ける。NUL を含むファイルは「文字ではない」として飛ばすため、UTF-16LE（BOM 付き）の `docs/notes.txt` に `SESSION_SECRET=<64桁>` を書いても止まらない（確かめた）。Windows PowerShell 5.1 の `Out-File`・`>` は既定で UTF-16LE で書くので、手元が Windows だと起こりうる | 先頭が `FF FE`／`FE FF` なら UTF-16 として読み直してから `findSecretLikeLines` にかける。または、NUL を含むファイルも `sk-ant-` と秘密鍵の見出しだけはバイト列で探す |
| 4 | 中 | 誤検知の形: テストで偽の環境を作る書き方 `{ MEMBER_PASSPHRASE: "…" }` と、`const SESSION_SECRET = env.SESSION_SECRET;`（名前に環境の値を入れ直す書き方）が「秘密の名前に値を入れている」で止まる（確かめた）。先輩の `POST /api/session` のテストは前者を書く可能性が高く、CI が落ちる。回避は今回のテストと同じ「文字をつなぐ」書き方しか無く、それが決まりとして書かれていない | AGENTS.md（または spec §10）に「テストで秘密の名前を使うときは文字をつないで作る。値はテスト用でも検査にかかる」と1行書き、先輩に伝える。`= env.`・`= process.env.`・`= c.env.` で始まる右辺は止めないようにする手もある（その場合は先にテスト） |
| 5 | 低 | JPEG の中身でも拡張子が違えば名前でも中身でも見ない。APP1 付きの JPEG を `public/photo.jfif`・`public/photo.png` に置くと通る（確かめた）。`.jpe`・`.tif`・`.avif` も同じ。また `inspectJpeg` は最初の SOS で止まるので、`public/demo/` の JPEG の後ろ（EOI の後）に APP1 付きの JPEG をつなげても通る（確かめた）。本文の弱点候補3は PNG・WebP のメタデータには触れているが、拡張子違いの JPEG と後ろにつなげた形には触れていない | 先頭が `FF D8 FF` のファイルは拡張子にかかわらず JPEG として扱い、`public/demo/` の外なら止める。`public/demo/` の JPEG は EOI の後ろにデータがあれば止める（どちらも先にテスト）。少なくとも本文の弱点候補に足す |
| 6 | 低 | 座標の検査は `src/data/fields.json` の `lat`・`lng` だけを見る。(a) そのファイルはまだ無く、無いと何も言わずに通る。T09 で名前や置き場所が変わると、座標の検査が黙って止まる。(b) 架空の村の区画や道の座標（P15「区画と道を自分で描く」）を別の項目や別のファイルに持つと見ない。(c) 「座標は一覧だけに置く」決まりは decisions にしか無く、`src/services/candidates.test.ts` にはすでに一覧の外の座標がある（範囲の中ではある） | T09 で `fields.json` を足すときに「一覧に無ければ止める」を足す。区画・道の座標を持つなら同じ範囲で検査する。「テストの座標も `FICTIONAL_AREA` の中」を AGENTS.md に書く |
| 7 | 軽微 | 秘密の値の「8文字以上」はテストで守られていない（`{8,}` を `{1,}` にしても 46 件通る）。8文字未満の合言葉、空白を含む合言葉（`"mugi no shukaku"`）、テンプレート文字列（バッククォート）、LINE のトークン、PGP の秘密鍵（`…PRIVATE KEY BLOCK-----`）は見逃す（確かめた）。名前を変えた秘密・値だけの貼り付けは本文の弱点候補1にある | 合言葉の最短の長さを決めるなら、検査の 8 と合わせてテストを足す。空白入りの値を止めるかは本人が決める。LINE は L8 で足す（本文どおり） |
| 8 | 軽微 | `check-safety.mjs` は Node の型の除去（22.18／23.6 以降）に頼るが、`package.json` に `engines` が無い。古い Node では import の時点で落ちる。CI は 24 なので問題は無い | 必要なら README か `engines` に Node 24 を書く（共有ファイル） |

## 決まりとの照合
| 決まり | 結果 | 根拠 |
|---|---|---|
| K6 撮影位置を外に出さない | ○（該当は検査の側） | 差分に撮影位置を扱う処理は無い。`public/demo/` の JPEG の APP1〜15 を止めるので、位置付きの写真は止まる（#5 の形を除く） |
| K10 実データを入れない | ○（#1・#6 に注意） | 差分に実写真・実座標・個人名・CSV は無い。テストの座標は 41.8〜41.815・144.5〜144.52 の中と、わざと外にした 42.6・143.2（外の例として架空。実在の圃場との対応は無い）。検査は「メタデータが無い」までしか確かめられない（#1） |
| 秘密を入れない・出力に出さない | ○ | 差分に合言葉・キー・`.dev.vars` は無い。テストは秘密らしい文字列をつないで作っている。検査の出力はファイル・行・種類だけで、値は出ない（作業用のリポジトリで `docs/notes8.txt:2  ← 秘密らしい文字列（秘密の名前に値を入れている）` と出て、値は出なかった） |
| 層の決まり | ○ | `safety-rules.ts` は純粋関数で、ファイルの読み込み・JPEG の解析は注入。`check-safety.mjs` は集めて読んで出すだけ。`any`・`@ts-ignore`・`eslint-disable` は無い |
| 共有ファイル（§2） | ○（承認待ち） | `src/config.ts` に `FICTIONAL_AREA` を足した。本文に「先輩の確認を待ってからマージ」とある。`AGENTS.md`・`package.json`・`src/types/` は変えていない（#1 で AGENTS.md の更新を勧める） |
| 担当のフォルダ | ○ | 先輩の `src/services/jpeg-segments.ts` は import するだけで変えていない（同ファイルの冒頭に「scripts/ の安全検査からも使う」とある） |
| RED と GREEN は別のコミット | ○ | `1141a39`（テスト＋4つとも `throw new Error("not implemented")` の空の実装）→ `cc5039d`（`safety-rules.ts` だけ） |
| `toThrow()` を引数なしで使わない | ○（該当なし） | 例外を期待するテストは無い |
| 1つの PR に1つの関心事 | ○ | 安全検査の中身と、その文書だけ |
| 本文と差分の一致 | ○（#1・#5 を除く） | 46 件の内訳（23・4・6・13）、46 ファイル、NUL のファイルを飛ばすこと、`MODULE_TYPELESS_PACKAGE_JSON` の警告、弱点候補1〜4は差分・実行結果と合っている。AGENTS.md §1-5 との食い違いと、拡張子違いの JPEG は書かれていない |

## 確かめたこと
- `git rev-parse --short HEAD` → `0afd9d9`（`gh pr view 39` の `headRefOid` と同じ）
- `node scripts/check-safety.mjs` → `check:safety: 46 ファイルを確認`／`OK（名前・デモの JPEG・圃場の座標・秘密らしい文字列）`、終了コード 0（`MODULE_TYPELESS_PACKAGE_JSON` の警告あり。本文どおり）
- `npx vitest run scripts/` → `Tests 46 passed (46)`
- `npx eslint scripts/ src/config.ts` → 終了コード 0
- `npx tsc --noEmit --incremental false` → 終了コード 0
- `npm run check` 全体（build を含む）は回していない（build の生成物をリポジトリのフォルダに作らないため）。本文には終了コード 0 とある
- RED（`git show 1141a39:scripts/safety-rules.ts`）は4つの関数すべてが `throw new Error("not implemented")`。46 件はどれもこのどれかを呼ぶので、RED では全部落ちる（読んで確かめた。RED を実際に回してはいない）
- 上の後の `git status --porcelain --untracked-files=all` → 出力なし
- **作業用のリポジトリでの検査**（リポジトリの外に `git init` し、`check-safety.mjs`・`safety-rules.ts`・`jpeg-segments.ts`・`config.ts` を写して、試しのファイルを `git add` して実行）

  | 置いたもの | 結果 |
  |---|---|
  | `public/demo/ok.jpg`（APP 無し） | 通る（正しい） |
  | `docs/notes8.txt`（UTF-8、2行目に `SESSION_SECRET=<64桁>`） | 止まる。`docs/notes8.txt:2` と種類だけで、値は出ない |
  | `src/data/fields.json`（緯度 41.79 と経度 144.53） | 2件とも止まる（実装は正しい。テストに無いだけ → #2） |
  | `docs/notes.txt`（UTF-16LE で同じ内容） | **通る**（#3） |
  | `public/photo.jfif`・`public/photo.png`（中身は APP1 付きの JPEG） | **通る**（#5） |
  | `public/demo/trailer.jpg`（APP 無しの JPEG の後ろに APP1 付きの JPEG） | **通る**（#5） |

- **関数を直接呼んだ試し**（リポジトリの外のスクリプトから `scripts/safety-rules.ts` を import）
  - 止まらない（見逃し）: `MEMBER_PASSPHRASE=mugi26`（6文字）、`MEMBER_PASSPHRASE="mugi no shukaku"`、`memberPassphrase: "…"`、バッククォートの値、`LINE_CHANNEL_ACCESS_TOKEN=…`、値だけの64桁、PGP の秘密鍵の見出し（#7）
  - 止まる（誤検知）: `const SESSION_SECRET = env.SESSION_SECRET;`、`const ANTHROPIC_API_KEY = c.env.ANTHROPIC_API_KEY`、`if (env.SESSION_SECRET===undefined)`、`{ MEMBER_PASSPHRASE: "…", … }`、`ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}`（#4）
  - 止まらない（正しい）: `SESSION_SECRET=$(node -e …)`、`npx wrangler secret put SESSION_SECRET`
  - `checkFileName`: `.jfif`・`.jpe`・`.png`・`.webp`・`.tif`・`.avif` はどこでも `null`（#5）。`PUBLIC/DEMO/a.jpg` は `null` だが、配線側の正規表現が大文字小文字を無視するので中身は見られる
- **テストが誤った実装を捕まえられるか**（凍結のテストを作業用のフォルダに写し、実装を1か所ずつ壊して `vitest run`）

  | 壊し方 | 結果 |
  |---|---|
  | 元のまま | 46 件通る |
  | 経度の上限（`lng <= lngMax`）を見ない | **46 件通る**（#2） |
  | 緯度の下限（`lat >= latMin`）を見ない | **46 件通る**（#2） |
  | 緯度の下限を `>` にする（端を含めない） | 1件落ちる |
  | APP1 だけ止める | 1件落ちる |
  | 値の最短 8 を 1 にする | **46 件通る**（#7） |
  | `public/demo/` の最後の `/` を外す | 1件落ちる |
  | 名前を小文字にしない | 2件落ちる |
  | `名前: "値"` の形を見ない | 1件落ちる |
  | キーの最短 20 を 3 にする | 1件落ちる |

- 確かめていないこと: `npm run check` の build、GitHub の CI の結果、Linux（CI）での `MODULE_TYPELESS_PACKAGE_JSON` の警告以外の差、本文の AT-2〜AT-5 を書いた側がどう試したか
