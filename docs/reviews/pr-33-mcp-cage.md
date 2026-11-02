# PR #33 のレビュー（MCP の檻）

- 対象: akutodazo/ear-to-ear#33、コミット `4932ba8`
- レビューした者: 書いた会話を見ていない別の Claude Code のセッション（Claude Opus 5.5、`claude -p`、33手、$1.14）。AGENTS.md §3 の決まりによる
- 渡したもの: PR の番号と「AGENTS.md と docs/spec.md を読んでから見る」だけ

## 結論
**このままでは無人運転に使わないでください。** 指摘 1・2 が、PR の目的である「`run_tests` 経由の抜け穴を塞ぐ」を満たしていません。普通の `import` を1行書くだけで純粋関数の検査を通り、`.dev.vars` を読める見込みです。指摘 3〜5 も、無人で使う前に直す必要があります。

## 指摘
| # | 重さ | 内容 | 根拠 | 勧める対応 |
|---|---|---|---|---|
| 1 | **高** | `import` の許可リストを外へ抜けられる。`./.+` と `@/services/.+` が `..` と `?` を許している | `scripts/cage/policy.mjs:7`。`./../../.dev.vars?raw` と `@/services/../../scripts/x` は検査結果が `[]` だった（実行で確認）。Vite 8.3.5 の `?raw` は、ファイルをそのまま文字列にして返す（`node_modules/vite/dist/node/chunks/node.js:32569-32573`） | 正規表現を `/^(@\/types\|@\/config\|\.\.\/types\|\.\.\/config\|(@\/services\|\.)(\/[\w-][\w.-]*)+)$/` にして、`..`・`.dev.vars`・`?raw` が通らないことのテストを足す |
| 2 | **高** | `import fs = require("node:fs")` が検査を通る。`ImportEqualsDeclaration` を見ていない | `policy.mjs:52-55`。検査結果は `[]`（実行で確認）。Vitest はテスト対象のモジュールに `require` を渡す（`node_modules/vitest/dist/module-evaluator.js:181`）。この構文が Vite の変換後も動くかは未確認で、**動くと推定** | `ts.isImportEqualsDeclaration` を拒否し、テストを足す |
| 3 | **中** | `CAGE_CHECKS` が未設定だと、検査を1つも実行せず「検査済み・人の確認待ち」の REPORT をコミットする | `scripts/cage/server.mjs:12`・`:79-83`。`docs/dev/cage.md:30` のとおり C1〜C5 は未定なので、今はこの状態になる | 検査が0件なら `report` を拒否し、テストを足す |
| 4 | **中** | `run_tests` と `report` に時間の上限が無い。`while (true) {}` は検査を通り、同期実行なので MCP サーバーごと止まる。起動コマンドにも上限が無い | `server.mjs:27`（コードから判断。実行はしていない） | `execFileSync` に `timeout` を付け、テストを足す |
| 5 | **中** | 許可リストの決め方が無人運転の決まりと合っていない。TASKS どおりに REPORT.md を入れると、モデルが偽の REPORT を書いて `commit_green` でコミットできる。外すと QUESTIONS.md に書けず、止まるときの手段が無くなる | `docs/dev/cage.md:27` と `docs/run/TASKS.md:34`、AGENTS.md §5、`server.mjs:47`・`:68`。テストも REPORT.md を許可リストに入れている（`server.test.ts:42`）。PR が塞いだはずの弱点 W1 が戻る | REPORT.md は常に `report` だけが書く形にする。QUESTIONS.md は `write_file` で書けるようにし、`commit_green` の対象から外す |
| 6 | 低 | `.dev.vars` が読めると、中身が会話に出るだけでなく、C1〜C5 にテストを入れた場合は REPORT.md にも書かれ、コミットされる | `server.mjs:61`・`:79-83`。指摘 1・2 を直せば経路は大きく減る | 残る抜け（`cage.md` の計算した名前）もあるので、push の前に REPORT.md を人が確認する手順を `cage.md` に足す |
| 7 | 低 | `cage.md` の既知の抜けが実態より狭い。計算しなくても `const {"constructor": F} = () => 0` は通る | `policy.mjs:61-63` は `a["constructor"]` の形しか見ていない。検査結果は `[]`（実行で確認） | 分割代入の文字列キーを拒否する。`Object.getOwnPropertyDescriptor` など他の経路は残るので、`cage.md` にも書き足す |
| 8 | 低 | 正しいコードを誤って拒否する。変数・引数・型の項目・メソッドの名前が `document` や `fetch` だと通らない | `function f(document: string)`・`interface X { document: string }`・`class A { process() {} }` は拒否された（実行で確認）。§8 の `handover-document.ts` と、§4 の「fetch は引数で注入」にぶつかりやすい | 変数として参照する所だけを見るようにするか、対象を Service に限ると `cage.md` に書く。`react` も通らないので、hooks・components は今のままでは対象にできない |
| 9 | 低 | ブラウザ API が検査を通る。§4 の「Service はブラウザ API に依存しない」を守り切れない | `localStorage`・`navigator`・`crypto` を使うコードの結果は `[]`（実行で確認） | 禁止の名前に足す。`crypto` は使う Service が無いか確認してから |
| 10 | 低 | 手順どおり `server.mjs` を外に置くと、`typescript` が解決できず起動しない見込み | `cage.md:32` と `policy.mjs:4`。Node は置いた場所から `node_modules` を探す（確認しようとした実行は権限で止められた） | リポジトリの複製の外ではなく、別の場所の `node_modules` が見える置き方を `cage.md` に書く |
| 11 | 低 | Windows では `CAGE_CHECKS` に `npm` を直接書けない見込み。失敗すると原因が `FAILED` と `null` や `undefined` だけになる | `server.mjs:27`・`:29`。`execFileSync` はシェルなしで `npm.cmd` を実行できない（実行は未確認） | `e.message` も出力に入れる。`cage.md` に `node` 経由で書くと明記する |
| 12 | 軽微 | 検査の対象外の拡張子がある。`.cjs`・`.mts`・`.jsx` は検査されない | `server.mjs:49` | 許可リストに入れる可能性が無ければ対応不要 |
| 13 | 軽微 | 日本語のファイル名は `read_file` で読めない見込み。`git ls-files` が名前を変換して返すため | `server.mjs:23`。拒否される側に倒れるので事故にはならない | `git ls-files -z` にする |

**直す順番:** 1 → 2 → 3 → 4 → 5。

## 決まりとの照合
| 項目 | 結果 |
|---|---|
| 撮影位置（K6） | 差分に撮影位置の処理は無い |
| 実データ（K10）・秘密 | 差分は `.mjs`・`.ts`・`.md` の5ファイルだけ。テストの値は `DUMMY_CANARY` などのダミー |
| RED と GREEN | コミットは RED → GREEN の順に分かれている。件数は確かめていない |
| 禁止事項（§4） | 差分に `any`・`@ts-ignore`・`eslint-disable` は無い |
| #12 との食い違い | PR の本文に明記してある。本人の決定待ち |
| 既存コードの持ち込み（§1） | 確かめていない。比べる元のコードを見ていない |

## 確かめていないこと
権限の設定で `git fetch`、`gh issue view`、`gh pr checks`、ファイルの作成、テストの実行が止められたため、次は未確認です。

- **秘密の読み取りの実証:** 検査を通ることは実行で確かめましたが、MCP 経由でダミーの秘密を読むところまでは動かしていません。`?raw` は Vite のソースからの判断です。
- **テストと CI:** `npm run check` とテスト 69 件は実行していません。CI の `check` は取得時点で `QUEUED` でした。
- **Issue の内容:** #12 と #14 は読めていないので、PR の本文の記載で判断しました。

## 指摘への対応（書いた側、同じ PR で）
| # | 対応 |
|---|---|
| 1・2 | 修正。テストを足した。`./../../.dev.vars?raw`・`@/services/../../x`・`import x = require()` は拒否される |
| 3 | 修正。検査が0件の `report` は拒否する |
| 4 | 修正。子プロセスに上限（既定 120 秒、`CAGE_TIMEOUT_MS`）。起動コマンドの上限は `--max-turns` に任せる |
| 5 | 修正。REPORT.md は `report` だけが書く。QUESTIONS.md は常に書けるが、コミットしない |
| 6 | 文書に足した（push の前に REPORT.md を人が読む） |
| 7 | 修正（文字列のキーを拒否）。`Object.getOwnPropertyDescriptor` などの経路は残り、文書に書いた |
| 8 | 修正（自分で宣言した名前・型の項目・メソッド名は拒否しない）。`react` は通らないので、対象は Service に限ると文書に書いた |
| 9 | 修正。`crypto` も禁止した。いまの Service はどちらも検査を通る |
| 10・11 | 修正・文書に追記。`server.mjs` は `node_modules` が見える場所から動かす。失敗の出力に原因を入れた |
| 12・13 | 修正 |

指摘 1 の実証（Vite の `?raw` で本当に読めるか）はしていない。塞いだので確かめる理由が無くなった。
