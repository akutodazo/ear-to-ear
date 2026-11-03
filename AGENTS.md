<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# ear-to-ear — 共通ルール（Claude Code・Codex の両方が読む）

**何を作るか**: 小麦収穫委員会の写真共有。委員が合言葉を入れて写真を送るだけで、圃場番号の候補と撮影日が付いて全員に共有される。番号が決まらなくても「未確定」として先に共有し、管理者が確定・訂正する。判断（収穫可能／収穫済）とその理由（農協の判定を含む）も同じ地図に残り、Claude が引用（Citations）で根拠付きの引き継ぎメモを作る。中心は「**写真を見つける**」と「**判断を根拠付きでたどれる**」。仕様は `docs/spec.md`、決定は `docs/decisions.md`、公開範囲は `docs/privacy.md`。

**期間**: Built with Claude: Japan 2026。2026-11-02 12:00 〜 **11-08 20:00 JST 提出**（11/8 の昼までに一度提出）。11/7 の夕方以降は新しい段に手を付けない。

## 1. 絶対に守ること（違反は失格・事故）
1. **既存のコードを持ち込まない**。本人の既存プロジェクト（field_share、my-waypoint-site など）は読んで考え方を参考にするのは可。ファイルのコピー・関数の貼り付け・見ながらの打ち直しは不可。他人・組織のコード（Drone Shot など）も入れない
2. **実在の農家のデータを入れない**: 実写真・実在の圃場の座標・委員会シート・番号対応表・個人名。データはすべて架空（圃場番号は `A-01` 形式、12圃場程度、座標は決めた範囲に機械的に並べる）。Claude API にも実データを送らない
3. **秘密を入れない・会話に貼らない**: 合言葉・`SESSION_SECRET`・API キー・LINE のトークン・`.dev.vars`。環境変数 `ANTHROPIC_API_KEY` は置かない
4. **撮影位置は端末の外に出さない**: 座標も、候補の畑までの距離もサーバーに送らない・保存しない。送るのは候補の番号（近い順、最大3）だけ。公開側の画像に APP1〜APP15 を残さない
5. **画像は `public/demo/` の JPEG だけコミットしてよい**（11-03 本人決定）。架空のもの・期間中に作ったもので、メタデータ（APP1〜15）が無いこと。安全検査（`npm run check:safety`）が確かめるのはメタデータが無いことまでで、**実写真かどうかは分からないので人が確かめる**。メタデータ付きの写真が要るテストはテストの中でバイト列を組み立てる。合成写真の出力先は `/private/fixtures/`（.gitignore 済み）
6. **テストの中の秘密の名前と座標**: 秘密の名前（`MEMBER_PASSPHRASE` など）にテスト用の値を入れる書き方は、値がテスト用でも安全検査にかかる。名前を文字をつないで作る（例 `"MEMBER_" + "PASSPHRASE"`）か、`env.` から入れ直す形にする。テストの座標は `FICTIONAL_AREA`（`src/config.ts`）の中に置く
7. 決定（`docs/decisions.md` の K1〜K17）を変えるときは理由を書いて本人の承認を取る。迷ったら推測で進めず、人に聞く

## 2. 担当のフォルダ（同じファイルを2人が書かない）
| 担当 | 範囲 |
|---|---|
| 先輩（サーバー側） | `worker/`、`migrations/`、サーバー側の Service（`jpeg-segments`・`upload-meta`・`session-token`） |
| 本人（ブラウザ側） | `src/app/`、`src/components/`、`src/hooks/`、`src/lib/`、ブラウザ側の Service（`photo-meta`・`candidates`・`photo-groups`・`status-reason`） |
| 共有（変えるときは両方が承認） | `src/types/`、`src/config.ts`、`AGENTS.md`、`package.json` |
| 後で決める | `usage-limit`・`handover-*`・`line-signature`（L0 が終わった時点で手が空いている方） |

## 3. 進め方
- **合格条件を先に書く → テスト → 実装**。RED（テスト）と GREEN（実装）は別のコミット
- 例外を期待するテストに引数なしの `toThrow()` を使わない（`toThrow(InvalidJpegError)` や `toThrow(/JPEG ではない/)` のように何を期待するか書く）
- **1つの PR に1つの関心事**。PR の本文: 影響範囲／使ったライブラリ／同時に更新した文書／弱点候補3〜5個／検証ログ（RED・GREEN・lint・test・build）
- **レビューは書いた側と違う側**: 本人の PR は先輩、先輩の PR は本人。`main` に直接 push しない
  - main の保護（GitHub の Ruleset）は「PR 必須・CI（`check`）必須・削除と force push の禁止」。**マージに要る承認は 0**（11-02 本人決定。先輩の作業を増やさないため）。書いた側だけでもマージできるので、相手のレビューは仕組みでは強制されない。運用で守る
- PR の前に `npm run check`（安全検査 → lint → 型 → テスト → build）を通し、差分を目で見る（画像・CSV・文書が増えていないか）
- **Claude が書いた変更のレビュー**（11-02 本人決定）: 撮影位置・実データ・秘密に関わる PR（K6・K10）と、提出前の全体の点検（11/7）は、**書いた会話を見ていない別の Claude Code のセッション（Opus）**でレビューする。渡すのは PR の番号と「AGENTS.md と docs/spec.md を読んでから見る」だけ（背景・経緯は渡さない）。結果は `docs/reviews/` に置き、指摘に対応しない場合は理由を PR に書く。それ以外の PR は、テスト（人が読んで凍結）・CI・安全検査で守る
- Codex の点検とサブエージェントは**基本使わない**（期間が短く、確かめる人の手間を増やさないため）。別の会社のモデルの目が要るときだけ Codex を使う
- **詰まったとき**: 同じ問題にやり方を変えて3回、または30分取り組んでも決まらず、原因が「判断材料が欠けている」か「実用になるか判断できない」ときは、新しいセッションで Fable に相談する（今のセッションのモデルは変えない）。渡すのは、問題・試したことと結果・なぜ詰まったか・欲しい答えの形。答えは材料で、決めるのは人。父や運営にしか答えられないことは Fable ではなく人に聞く

## 4. 層の決まり（docs/spec.md 技術とフォルダ）
| 層 | 置き場所 | 決まり |
|---|---|---|
| 型 | `src/types/` | — |
| Service | `src/services/` | **純粋関数**。ブラウザ API・React・fetch に依存しない。テストの主戦場 |
| Repository | `src/repositories/interfaces/`、`implementations/` | 契約は Promise。fetch は引数で注入 |
| Presenter | `src/hooks/use-*.ts` | Repository の実体を知るのはここだけ |
| UI 部品 | `src/components/` | props だけで受け取る |
| page | `src/app/` | 配線だけ。静的書き出し（`output: 'export'`）なので動的ルートは `generateStaticParams` が要る |
| ブラウザ専用 | `src/lib/` | 縮小・再エンコード、SHA-256 |
| Worker | `worker/` | ハンドラは薄く、判定は Service。CPU 10ms に収まる処理だけ |
| 設定 | `src/config.ts` | 定数はここに1回だけ |

- 命名は kebab-case、interface は `i-`、フックは `use-`。`any`・`@ts-ignore`・`eslint-disable` 禁止
- Next.js は版で作法が変わる。**書く前に `node_modules/next/dist/docs/` の該当ガイドを読む**
- 言葉を盛らない。推定は推定と書く。水分・収穫の可否を Claude に言わせない

## 5. 無人運転のとき（`/goal` か MCP の檻で動いているとき。本人・先輩どちらのパケットも）
決まりの全文は本人の手元のハーネス設計（v0.5、11-03）。流れ: 設計（必要なら Fable）→ RED（人）→ 攻撃役（凍結の前、`docs/dev/test-attack.md`）→ 凍結 → 無人の GREEN → C1〜C5 → 人の確認 → 別のセッションのレビュー → PR。道具はパケットで選ぶ: Service だけのパケットは檻（`docs/dev/cage.md`）、画面・`src/lib`・ブラウザの API を使うものは `/goal`（手元の deny・push 先の無効化・pre-push フック）。どちらでも秘密を外す。リポジトリ側で守ること:
- 扱うのは `/goal`（檻では `claude -p` の指示）で名指しされた **1パケット**だけ（`docs/run/TASKS.md`）。無人で行うのは **実装（GREEN）だけ**。テストは人が書く
- 変えてよいのは TASKS の「変えてよいファイル」と `docs/run/REPORT-Txx.md`（パケットごと。前の運転の REPORT を上書きしない）・`docs/run/QUESTIONS.md` だけ。**凍結ファイル**（`*.test.ts`、`tests/**`、`src/types/**`、`src/config.ts`、`vitest.config.*`、`package.json`、`package-lock.json`、`tsconfig*.json`、`eslint.config.*`、`.gitignore`、`.claude/**`、`AGENTS.md`、`CLAUDE.md`、`scripts/**`、`docs/run/TASKS.md`）は変えない
- テストが誤りに見えても直さない。仕様外の判断・対象外の変更・権限で止められた・検査が不合格のときは `QUESTIONS.md` に「何が起きたか・選択肢（2つ以上）・推奨」を書いて止まる（書き方の合格条件は `docs/dev/stop-report.md`）。直して検査を回し直さない
- push・PR・`gh`・`wrangler`・`npm install`・Secret・デプロイをしない。ブランチを切り替えない。`git reset --hard`・`git stash`・`git checkout -- .`・ファイル削除で変更を消さない
- GREEN をコミットした後、検査 C1〜C5 を**1回ずつ、他のコマンドとつなげずに**実行し、出力をそのまま会話と `REPORT-Txx.md` に貼って「Txx REPORT」でコミットする。「完了」ではなく「検査済み・人の確認待ち」と書く
- **QUESTIONS に書くのは `git status --porcelain --untracked-files=all` の出力のファイル名の列だけ**。差分の中身・ファイルの中身は貼らない。対象外・秘密の疑いのある変更は add・コミット・元に戻し・削除をしない
- （人）push の前に `REPORT-Txx.md` を読み、手元のパス・秘密が載っていないか確かめる。檻の `report` は今は `docs/run/REPORT.md` に書くので、人が確認のときに `REPORT-Txx.md` へ名前を変える（檻が直るまで）
