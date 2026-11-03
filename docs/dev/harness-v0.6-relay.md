# ハーネス v0.6 案「檻リレーと夜番」（日中の自律運転＋夜の点検）

状態: **案（11-03、先輩）。道具は 11-04 に `scripts/relay/` に組んだ（§11）。§8 の承認（Remote Control の ON は本人決定済み）は本人と対面で**。v0.5（本人の手元）の上に足す。檻（`docs/dev/cage.md`）は変えない。

作り方の記録: Fable のワークフロー（読み手 3・設計 3・審判 1・反証 3 の 10 体、約 21 分）で案を出し、反証の「止める」を全部取り込んだ。このワークフロー 1 回で週次の使用量が **全モデル 14→18%、Fable 10→18%** 動いた（事実、`get_usage`）。これが夜番の寸法の出発点（§6）。

## 0. 一言で
- **日中（檻リレー）**: 人が朝に「待ち行列」（RED 済みのパケットの列）を置く。LLM を呼ばない Node の進行役が、パケットごとに檻の `claude -p` を順に起動し、ゲート G-1〜G8 で合否を決め、止まったパケットは再開せず残りを続ける。人に聞くことだけがスマホに届く。
- **夜（夜番）**: 当日の差分だけを、秘密の無い clone の中で Workflow（ultracode）が多視点で探し、反証にかけ、**直さずに**朝の読み物にする。
- **予算**: 寝る前の週次 % が「前夜 + 14」を超えない。守るのは人の 4 回の記録と、進行役の起動前ゲート。

人が残す仕事（自動化しない）: RED を書く・凍結する、夕方に REPORT を読んで push・PR、マージ、夜番の指摘を RED にする。無人は GREEN と読むだけ（AGENTS.md §5）。

## 1. 1 日の流れ
| 時刻 | 誰 | すること | 所要 |
|---|---|---|---|
| 前日 | 人 | RED → 攻撃役 → 凍結 → main（従来どおり）。**翌日の列車の長さは、ここでそろえた RED の本数で決まる** | 1 本 30〜60 分 |
| 朝 1 | 人 | `git switch main; git pull`。`get_usage`（または claude.ai/settings/usage）の週次 %・5 時間 % を `docs/run/USAGE.md` に 1 行。PC のスリープ・ロックを切る | 3 分 |
| 朝 2 | 人 | 待ち行列 `%LOCALAPPDATA%\ear-train\trains\<MMDD>.json` を書く（§2）。`run-day --prepare` で worktree をパケット分作り `npm ci` | 5 分＋2 分/本 |
| 朝 3 | 人 | 本体の `.dev.vars` を `%LOCALAPPDATA%\ear-train\secrets\` に退避（wrangler dev を使うときだけ戻す） | 1 分 |
| 朝 4 | 人 | 通知係のセッションを起動（§4）→ 固定文を貼る → 通知係が進行役を背景で起動 | 5 分 |
| 日中 | 無人 | 1 本 15〜30 分 × 本数（実測: T19〜T21 は GREEN まで数分〜14 分、REPORT 1 分） | — |
| 日中 | 人（スマホ） | ask／stopped／done の通知だけ。返事は「Txx を飛ばして続けて」か「止めて」の 2 語 | — |
| 12:00・15:00 | 人 | 通知に頼らない下限: `STATUS.json` の最後の 1 行を見る | 30 秒 |
| 夕方 | 人 | 最小形の確認（§7）→ `run/<MMDD>-Txx` を push → パケットごとに PR → TASKS.md の状態欄 | 1 本 10 分 |
| 寝る前 | 人 | 18 時の % を見て夜番の寸法を決め（§5）、夜番を起動（§6） | 5 分 |
| 翌朝 | 人 | 夜番の報告の「止める」だけ読む → 採るものを RED に → 翌日の待ち行列の先頭 | 5〜15 分 |

11/7 はリレーを走らせない（`docs/schedule.md`）。11/6 の夜番は小さくして、11/7 夜の全体点検（別セッション Opus）の枠を残す。

**正直な見積もり（反証役の指摘）**: 1 パケットは 15 分前後なので、「1 時間以上の自律」は列車の仕組みではなく **朝の時点で凍結済み RED が 4 本以上あるか** で決まる。11/4 は 3 本（T22・T06・T12）で数字を取り、以後は前夜に RED を 4 本以上そろえた日だけ 1 時間超を狙う。自律時間は「列車の壁時計」ではなく「人が触らない時間（起動〜夕方の確認）」で定義し、README には実測の壁時計・手数・$・%・止まった率をそのまま載せる。

## 2. 道具
変えない: `scripts/cage/server.mjs`・`policy.mjs`（5 道具、CHILD_ENV、mask、report）。`.claude/settings.json` も変えない（道具の制限は起動引数で渡す）。

新規 `scripts/relay/`（凍結 `scripts/**` の仲間。人が PR で入れる。担当は先輩、本人がレビュー、別セッションのレビューも通す）:
| ファイル | 役目 |
|---|---|
| `checks.mjs` + test | パケットから `CAGE_TEST`・`CAGE_CHECKS`（C1〜C5）・`cage.json` を作る純粋関数。`rejectFrozen(allow)`: allow に凍結・共有ファイル（AGENTS.md §5 の列挙と §2 の 4 つ）があれば列車ごと起動を拒否 |
| `check-entry.mjs` | C1〜C5 の入口。C4 は `node node_modules/npm/bin/npm-cli.js run check` を spawn（argv がシェルを通らない問題を吸収） |
| `gates.mjs` + test | G-1〜G8 の純粋関数。`docs/run/REPORT-T21.md` を正例、試運転 A の失敗出力を負例として凍結 |
| `mask.mjs` + test | server.mjs の mask と同じ（作業フォルダ・ホーム・ユーザー名・ANSI）。TRAIN・state・ledger・STATUS に書く文字列は全部通す |
| `run-day.mjs` + test | 進行役。LLM を呼ばない。引数は `--today MMDD` と `--skip Txx` の 2 形だけ（他はエラー）。`--prepare` で worktree 作成 |
| `watch.mjs` | `STATUS.json` の `seq` が増えるまで待つ。**終了理由に関わらず最短 60 秒**。起動回数を数え、上限（パケット数+3）を超えたら `STOP` を書いて exit 2 |
| `stop.mjs` | `STOP` ファイルを作る |
| `night-targets.mjs` | 当日の対象ファイル一覧と中身（`git show`）を JSON に書き出す |
| `night.mjs` | clone の準備（§6）。翌朝 `--collect` で件数表だけを `docs/reviews/` に置く |
| `night-review.workflow.mjs` | Workflow スクリプト（§6） |
| `PACKET.txt`・`NOTIFIER.txt`・`NIGHT.txt` | 固定の指示文。`Txx` だけ置換、経緯は足さない（T18〜T21 の指示文が正本） |
| `docs/dev/relay.md`・`docs/dev/night-review.md` | 決まり（この文書を分けて正本にする） |

リポジトリの外 `%LOCALAPPDATA%\ear-train\`（`C:\tmp` は他の Claude セッションの作業フォルダなので使わない）:
`trains/<MMDD>.json`、`state/<MMDD>.json`、`STATUS.json`（1 行 `{seq,packet,state,reason}`。`reason` は列挙 `limit|ask|commits|scope|size|check|dirty|log|budget|dep|usage|unknown|done` だけ、自由文禁止）、`ledger-<MMDD>.jsonl`（追記のみ、消さない）、`logs/<MMDD>-Txx.jsonl`（CAGE_LOG。write_file の全文が残るので 11/7 の点検前に `--purge-logs`）、`usage.json`（通知係が `get_usage` で書く）、`secrets/`（退避した `.dev.vars`）、`STOP`。
worktree は **パケットごと** `<ホーム>\dev\ear-train\Txx`（1 つを使い回すと、止まったパケットの未追跡 QUESTIONS が次に持ち越されて全部 ask に倒れる）。`npm ci` 必須、junction 禁止（T04）。

待ち行列:
```json
{ "date":"1104", "model":"opus", "capUsd":3.0, "maxBudgetUsd":1.5, "maxToolCalls":40, "wallMinutes":45,
  "trainHours":4, "maxAddedLines":400, "maxCheckOutputKb":20,
  "packets":[
    {"id":"T22","base":"main","allow":["worker/assignment.ts","worker/photo-query.ts"],"tests":["worker/assignment.test.ts","worker/photo-query.test.ts"]},
    {"id":"T06","base":"main","allow":["src/services/photo-groups.ts"],"tests":["src/services/photo-groups.test.ts"]},
    {"id":"T12","base":"main","allow":["src/services/status-reason.ts"],"tests":["src/services/status-reason.test.ts"]} ] }
```
`base` が前のパケット id ならその GREEN の上に積む（base が止まっていたら `skipped(dep)`）。上の T22 は形の例（assignment は #79 で既に main にある）。11/4 は檻のパケット（Service・worker ハンドラ）だけ。画面（`/goal`）は $ の実測が無いので列車に載せない。

パケット 1 本（全部スクリプト）:
1. 起動前ゲート G-1・G8（§3）。
2. worktree で `git checkout -B run/<MMDD>-Txx <base の sha>`。`git config extensions.worktreeConfig true` の上で `git config --worktree remote.origin.pushurl no_push`（本体の push は止めない）。`git status --porcelain --untracked-files=all` が空でなければ QUESTIONS.md だけ `state/` に移し、それでも空でなければ `stopped(dirty)` で次へ。START=HEAD を state に記録。
3. `cage.json`: CAGE_ROOT=worktree、CAGE_ALLOW=allow、CAGE_LOG、CAGE_TEST=`["node_modules/vitest/vitest.mjs","run","--reporter=dot",<tests>]`（出力を縮めて費用のぶれを抑える）、CAGE_CHECKS=C1 `git status --porcelain --untracked-files=all`／C2 `git diff --name-only <START>..HEAD`／C3 vitest の該当テスト／C4 `check-entry.mjs C4`／C5=C1、CAGE_TIMEOUT_MS=600000。
4. `claude -p "<PACKET.txt>" --tools "" --strict-mcp-config --mcp-config cage.json --allowedTools mcp__cage --permission-mode dontAsk --setting-sources project --no-session-persistence --model opus --max-budget-usd 1.5 --output-format stream-json`。子の env は CHILD_ENV と同じ 7 つだけ。
   - **`--max-turns` は手元の 2.1.299 に無い**（反証役が確認）。手数は CAGE_LOG の行数を進行役が見て `maxToolCalls` 超で kill → `stopped(turns)`。
   - 壁時計 45 分（REPORT の C4 が 10 分かかるので 30 では切れやすい）。Windows では SIGINT が効かず即 kill になる前提。kill した本は最終 JSON が無いので **費用を `maxBudgetUsd` いっぱいとして記帳**（安全側）。stream-json を行ごとに読み、最後に見えた usage を ledger に残す。
   - ledger に残すのは `total_cost_usd`・`num_turns`・`is_error` の 3 つだけ。stdout 全体はファイルに残さない。
5. ゲート G0〜G7 → `STATUS.json`（seq++）→ 次へ。

## 3. ゲート（LLM なし。順に）
| 門 | 見るもの | 落ちたとき |
|---|---|---|
| G-1（起動前） | `usage.json`（無ければ朝の USAGE.md の値）: 週次 ≥ 当日上限−2 か 5 時間 ≥ 80 なら起動しない | 列車 `stopped(usage)` |
| G8（起動前） | `ledger 累計 + maxBudgetUsd > capUsd` なら起動しない（終了後ではなく **開始前** に見る。`--skip` の新しい列車でも同じ日付の ledger を数え続ける） | 列車 `stopped(budget)` |
| G0 | 終了コード 0 かつ `is_error` false。文言照合は補助。**「GREEN 0 かつ QUESTIONS 無し」が 2 本続いたら列車全体を止める**（5 時間制限に当たったときの連発を防ぐ、フェイルクローズ） | `stopped(unknown)` |
| G1 | `docs/run/QUESTIONS.md` が無い（有れば中身は読まず、`git status --porcelain --untracked-files=all` のファイル名の列だけ state へ） | `ask` |
| G2 | `git log --format=%s START..HEAD` が「`Txx GREEN: ` 1 つ以上＋最後に `Txx REPORT` 1 つ」だけ | `stopped(commits)` |
| G3 | `git diff --name-only START..HEAD` ⊆ allow ∪ {REPORT-Txx.md}、かつ凍結・共有ファイルが無い（allow に書かれていても落とす） | `stopped(scope)` |
| G4 | 追加行の合計 ≤ maxAddedLines | `stopped(size)` |
| G5 | REPORT の 1 行目・`## C1`〜`## C5`・C1 と C5 が空・`FAILED` 無し。**加えて `scripts/safety-rules.ts` の `findSecretLikeLines` を REPORT 全文にかける**、C3・C4 の出力が `maxCheckOutputKb` 以下 | `stopped(check)` / `stopped(leak)` |
| G6 | worktree の status が空 | `stopped(dirty)` |
| G7 | CAGE_LOG の write_file の path が allow ∪ {QUESTIONS.md}。拒否 3 回以上なら「迷っている」 | `stopped(log)` |

状態: `green` / `ask` / `stopped(理由)` / `skipped(dep)`。**1 本が止まっても `base: main` の残りは続ける**。列車全体が止まるのは G-1・G8・G0 の 2 連続・`STOP`・`trainHours`・待ち行列が空のとき。止まったパケットは再開しない（`docs/dev/stop-report.md`）。偽陽性は止まる側。

檻の既知の抜け（計算した名前、run_tests の隔離未検証、検査の出力経由で REPORT に秘密）は変わらない。列車化で無人の実行回数が 1 日 3〜4 倍になるので、**列車の間は本体の `.dev.vars` を退避する**（朝 3）。README では「誤操作の経路を消す」と書き「隔離」とは書かない。

## 4. 通知（人に聞くものだけ）
経路（未検証の段が 4 つ: watch の終了 → 通知係 → PushNotification → Remote Control → スマホ）。**試運転 A の合格条件に「スマホで実際に受信した」を入れ、届くまでの秒数を記録する**。届かなくても列車は進む（損失は小さい）ので、12:00・15:00 の人の目視を下限にする。

通知係: デスクトップアプリの対話セッション 1 本（Sonnet）。本体のチェックアウトで:
```
claude --model sonnet --add-dir %LOCALAPPDATA%\ear-train --allowedTools "Bash(node scripts/relay/run-day.mjs --today *),Bash(node scripts/relay/watch.mjs),Bash(node scripts/relay/stop.mjs),PushNotification" --disallowedTools "Read,Grep,Glob,Edit,Write,WebFetch,WebSearch,Agent,Workflow,Bash(git *),Bash(type *),Bash(cat *)"
```
→ `/remote-control` → `/config` で「Push when actions required」ON、予測・要約・アイドル圧縮 OFF、`CLAUDE_CODE_GOAL_CHECKIN_MINUTES=0`。スマホの Claude アプリを一度開く（「No mobile registered」対策）。朝に watch.mjs を 1 回手で動かし、権限の問いが出ないのを見てから離れる。

`NOTIFIER.txt` の要旨: 「run-day を背景で起動。watch.mjs を背景で起動し、終了コード 0 なら stdout の最後の 1 行（STATUS）を見て、state が ask／stopped／done なら PushNotification を 1 回。watch が exit 2 なら何もせず終わる。起こされるたびに `get_usage` を `usage.json` に書く。コード・差分・REPORT・QUESTIONS の中身は読まない。『Txx を飛ばして続けて』→ `--skip Txx` で再起動（再開ではなく新しい列車）。『止めて』→ stop.mjs」。
人の側の決まり: **許可の問いがスマホに来たら押さず「止めて」と返す**（Remote Control の会話は Anthropic のサーバーに残る。差分・QUESTIONS・パスを本文に入れない）。

通知する（1 日最大 4〜5 回）: ask「T22 停止: 質問あり（他は続行）」／stopped「T06 停止: check。他は続行」／usage・budget「列車停止: 上限。残り T12 未着手」／done「列車終了: GREEN 2／ask 1／stopped 0、$2.1」。
通知しない: GREEN・REPORT のコミット、C1〜C5 の個別結果、進捗、夜番の開始・途中・終了。

進行役を通知係の背景 Bash から起動する入れ子は未検証。試運転 A は 2 段（§9）で、落ちたら退路: 人が PowerShell から進行役を起動し、通知係は watch だけ。

## 5. 予算（1 日 14%）
事実:
- 週次はサブエージェント・Workflow を含む全モデル共有（公式）。`-p` は上限に当たると自動再開せず失敗する。クラウドの予約タスクは `/usage` に出ないので使わない。
- 11-03 の実測: 檻 1 本 $0.51〜0.87（Opus 5.5）、Fable の設計相談 1 本 $3.8〜6.4。**この設計のワークフロー 1 回（10 体、Fable）で全モデル +4%、Fable +8%**。つまり多体の Fable ワークフロー 1 周 ≒ 1 日の枠の 3 割。
- $ と週次 % の対応表は無い。11-03 は檻 6 本（計 $3.2）＋ Fable 設計 4 本（計 $20）＋対話で 14% だった → 推定: **檻 1 本 ≈ 0.3〜1%、Fable 設計 1 本 ≈ 2〜4%**。支配項は無人側ではなく人の対話・設計側。

累積の上限（寝る前の週次 % ≤ 前夜 + 14）: 11/3 夜を 20% とすると 11/4 ≤34、11/5 ≤48、11/6 ≤62、11/7 ≤76。残り 24% は 11/7 夜の全体点検と提出の予備で、前倒しで使わない。週次のリセットは 11/9 0:00 JST（締切の後）なので期間中に戻らない。

配分（推定。校正後に直す）: 対話（RED・設計・PR、Opus）5% ／ 別セッションのレビュー・攻撃役・relay の PR のレビュー（Opus）1.5% ／ リレー 4%（capUsd=3）／ 通知係 0.5% ／ 夜番 2.5% ／ 予備 0.5%。

校正（11/4、必ず）: 列車 1 本（3 パケット、$2 前後）の前後差で「$1 ≈ x%」（1 パケットだと整数表示の % が 0〜1 しか動かず 2 倍ぶれる）。夜番は夜番自身の試運転の前後差で別に測る。読み取りは `get_usage` に統一し、通知係が `usage.json` に書き、人が USAGE.md に写す。校正前は仮置き「$1 ≈ 1%」で G8 を動かす。

自動で止まる: 檻 1 本は `--max-budget-usd 1.5`・tool 呼び出し 40・壁時計 45 分／列車は G-1・G8／夜番は `budget` と体数の上限・1 周固定・lock ファイル。
人が落とす順: ①18 時の % が「朝 + 10」超 → 夜番を半分（§6 の小） ②「朝 + 13」超 → 夜番を休む ③Fable は詰まったときの相談（AGENTS.md §3）だけで、予定には入れない。**読み取りだけ・単体セッション・Workflow 禁止・50 手以内**。相談の前に Fable の週次が 60% 未満であることを確かめる ④累積が当日の上限を 3% 超えたら翌日は対話だけ ⑤GREEN の Opus→Sonnet は最後の手段（止まる率が上がり人の時間を食う。小さい worker ハンドラ 1 本で試してから）。
5 時間の窓: 列車は朝一番に起動し、人の対話は昼から（窓の頭を列車に渡す）。G-1 の 5 時間 ≥ 80 で起動を止める。

## 6. 夜番（監査。直さない・コミットしない・テストを走らせない）
対象（`night-targets.mjs`、モデルではない）: 当日 00:00 JST 以降に main に入った差分＋当日の `run/<MMDD>-*` ブランチの `src/**`・`worker/**` の `.ts/.tsx`（テスト・docs・public/demo は除く）。中身は `git show` でスクリプトが JSON に入れて渡す。
場所: `%LOCALAPPDATA%\ear-train\night\<MMDD>` に `git clone --depth 1 --branch main --single-branch file://<本体>`（`.dev.vars`・`private/`・`.env*` が物理的に無い。run ブランチの REPORT も入らない）。clone から `docs/run/` を消してから起動。`gh`・`wrangler`・ネットは使わない。

起動（人、寝る前。clone の中で。会話の経緯を持たない新しいセッション）:
```
claude --model opus --allowedTools "Workflow,Write(docs/reviews/night-*)" --disallowedTools "Read,Grep,Glob,Edit,Bash,WebFetch,WebSearch,Agent,PushNotification" --setting-sources project --no-session-persistence
```
**Read・Grep・Glob を渡さない**（反証役: clone に秘密が無くても本体の `.dev.vars` や CAGE_LOG には絶対パスで届くし、deny は Read にしか効かない）。対象の中身は Workflow の `args` で渡す。NIGHT.txt は 1 行: 「`scripts/relay/night-review.workflow.mjs` を args=<targets.json の中身> で 1 回だけ実行し、戻りを `docs/reviews/night-<日付>.md` に書いて『終了』とだけ答える。再実行・追加調査をしない」。試運転 B で `-p --max-turns 4`（この版に無ければ `--max-budget-usd`）での起動が通れば夜も `-p` にして手数を縛る。画面は開けたまま寝る（閉じると続かない）。

ワークフローの骨子（plain JS、meta は純リテラル、`Date.now` 禁止で日付は args）:
- 先頭で `docs/reviews/night-<日付>.lock` を作る。あれば即終了（同日 2 周目を拒否）。
- Scope: files を 4 件ずつの塊に。0 件なら即終了。
- Find（barrier、塊 × 観点、**Sonnet、effort medium**）: ①撮影位置（K6: 座標・距離・端末 ID が応答・ログ・R2 のキー・REPORT に出る経路、APP1〜15 の残り）②秘密とログ（env・合言葉・ハッシュ）③入力の境界（Worker: サイズ・型・JSON・SQL の bind・CPU 10ms・409 の片付け・例外時の R2 残り）④仕様・決まり（spec・K1〜K17・AGENTS §4・凍結テストが縛っていない条項）。schema `{findings:[{file,line,claim,repro,severity:"止める|直す|気づき"}]}`。
- 重複除去（コード）。severity 順に上限件数まで。落とした数は `log()` で報告に書く。
- Refute（pipeline、各件 **Sonnet 1 票**。「止める」候補だけ **Opus 1 票を 3 件まで**。「反証せよ。確信が無ければ refuted=true」）: 反証されなければ CONFIRMED、Opus だけ反証なら PLAUSIBLE。テストは実行しない（再現は手順で書き、実行は朝の人）。
- **`try { Find → Refute } finally { Write }`**: budget で止まっても確定した分の報告が残る。
- Write（1 体、Sonnet）: 先頭に「止める」を 3 行以内 → 件数表（出た／消えた／残った／落とした）→ 各件 file:line・主張・再現手順・票・足すべきテスト名（コードは書かない）→「人が確かめること」。パス・秘密・差分を貼らない。

寸法（**初回は昼に小で走らせ、前後の % 差で決める。「全モデル 3% 以内」と実測できるまで Opus の反証と夜間の無人起動を許さない**）:
| 寸法 | Find | 件数上限 | Refute | 体数 | budget |
|---|---|---|---|---|---|
| 小（試運転 B・18 時超過時） | 2 塊 × 2 観点 | 6 | Sonnet 1 票 | ≤ 12 | +60k |
| 中（通常） | 塊 × 4 観点、≤ 8 体 | 12 | Sonnet 1 票＋止める候補に Opus ≤ 3 | ≤ 25 | 実測から「3%」相当 |
Fable は夜番に使わない（詰まったときの相談の枠を残す）。

置き場: 「止める」「直す」が RED になるか閉じるまでは詳細を `%LOCALAPPDATA%\ear-train\reviews\` に置き、リポジトリの `docs/reviews/night-<日付>.md` には件数表と対応済みの項目だけ（`night.mjs --collect`）。**リポジトリは公開（11-03 確認）なので、この形を採る**（直す前の脆弱性を自分で公開しない）。
夜番は「会話を見ていない別セッションのレビュー」（K6・K10 の PR、11/7 の全体点検）の代わりではない。モデルを下げるのは「下読み」だから（`docs/claude-usage.md` の「レビューのモデルは下げない」とは別物として §8 で承認）。

## 7. 人の確認の最小形（夕方、1 本 10 分）
必須: C2 の名前の一覧・REPORT の目視（秘密・パス、C3/C4 のブロックに env らしい行が無いこと）・G 判定の確認。壊して確認と `wrangler dev` の実機は K6・K10 に関わるパケットだけ。それ以外は別セッションのレビューか夜番に回す。

## 8. 承認が要る点（11/4 朝、本人と対面）
1. AGENTS.md §3「サブエージェントは基本使わない」の例外: 夜番の Workflow を「読むだけ・出力は docs/reviews・直さない・コミットしない・テストを走らせない」の条件で許す（共有ファイル）。
2. AGENTS.md §5 に 3 行: 「檻の起動 1 回は 1 パケット。進行役（`scripts/relay/run-day.mjs`）が順に起動してよい」「worktree での `npm ci` は『npm install をしない』の例外」「ブランチの切り替えと QUESTIONS.md の退避は進行役（Node）が行い、無人の Claude は行わない」（共有）。
3. `docs/decisions.md` に K18 案: リレー・ゲート・止まったパケットは再開せず残りを続ける・夜番・通知係の Remote Control・予算の累積上限と落とす順。
4. Remote Control を期間中 ON（会話が Anthropic のサーバーに残る。通知係は STATUS 以外読まない）。
5. `scripts/relay/**` の担当（提案: 先輩が持ち、本人がレビュー。別セッションのレビューも通す）。
6. 夜番のモデル（Sonnet 中心、Opus は「止める」候補 3 件まで）と「レビューのモデルは下げない」の整理。
7. 置き場: `docs/run/USAGE.md`・`docs/run/TRAIN-<MMDD>.md`（パケット id・状態・理由コード・$ だけ）・`docs/reviews/night-*.md`（件数表）。運用ファイルはリポジトリの外。
8. Fable は詰まったときの相談だけ（AGENTS.md §3 のまま、11-03 先輩確認）。予定には入れず、読み取りだけ・Workflow 禁止。
9. 夜番の詳細をリポジトリの外に置くこと（リポジトリは公開、11-03 確認）。
10. 11/4 の列車: 例の T22（assignment）は #79 で対話のまま入ったので、残りの RED（`GET /api/photos?fieldId=` など先輩分・T06・T12 の本人分）を昼までに凍結 → main。間に合わなければ 1〜2 本。承認前でも「手元の実験」として列車は動かせる。

## 9. 組む順（11/3 夜 3 時間＋11/4 朝 1 時間）
11/3 夜: (20) PACKET・NOTIFIER・NIGHT → (30) checks・check-entry＋test → (40) gates・mask＋test（REPORT-T21 を正例）→ (40) run-day・watch・stop → (20) worktree `ear-train\T99` と `npm ci` → (30) **試運転 A**（Haiku、使い捨て T99、2 本の列車。2 本目に QUESTIONS を書かせて ask → スマホに届くこと、`--max-budget-usd 0.02` で止まること・JSON に費用が載ること・`--max-turns` の有無を確認。入れ子は 2 段: ①人の PowerShell から進行役 ②通知係の背景 Bash から。$0.05 以内）。
11/4 朝: (30) night-targets・night・night-review.workflow・relay.md・night-review.md → (10) USAGE.md → 対面で §8 → 9:00 に列車で $→% を校正 → capUsd を決め直す。
11/4 昼: **試運転 B（夜番の小、昼に）** → % の前後差で中の寸法を決める。
11/4 夜: 夜番（小か中）。翌朝に形を直す。
削る順（全部できないとき）: `night.mjs --collect`（手でコピー）→ TRAIN の雛形 → G4・G7（G-1・G0〜G3・G5・G6・G8 は残す）。

## 10. 言い方（独自性）
**目標は世界初（11-03 先輩）**。ただし主張は裏付けてから書く（AGENTS.md §4「言葉を盛らない」）。審査で「似たものがある」と言われると、作品全体の信用を落とすため。

- **狙う所**（`docs/dev/prior-art.md`、11-03 の調査）: 部品にはそれぞれ先例がある。前例が見つからなかったのは、**夜の反証 → 人が凍結する RED → 檻の中の無人の GREEN** を一つの輪にし、LLM を呼ばないゲートで回すこと。これを世界初の柱にする
  - 使用量で止める仕組みは先例がある（usage-guard など）。「締切までの日割りの累積上限」は工夫として書き、柱にしない
- **裏付け**: 11-03 に Web 検索 11 回で 1 回目を済ませた。11/6 に日本語・GitHub のコード検索・深い検索を足して 2 回目を行い、`docs/dev/prior-art.md` を更新する
  - 前例が見つからなければ「調べた範囲（11-0x 時点）で前例が見つからなかった」と根拠付きで世界初と打ち出す
  - 似たものがあれば、違いを 1 行で書いて「〜を初めて組み合わせた」に絞る

示す組み合わせ:
1. 無人の Claude に組み込みの道具を一つも渡さず、自作 5 道具の檻だけで GREEN を書かせる
2. 人が凍結した RED に対して無人は GREEN だけ
3. 進行・合否・停止は LLM を呼ばない Node のゲートで決め、止まったパケットは再開せず残りを続ける
4. 人に聞くことだけがスマホに届く
5. 夜は当日の差分を多視点で探して反証にかけ、直さずに朝の読み物にする
6. 予算は「前夜 + 14%」の累積上限と起動前ゲートで守る

README に載せる表: 運転回数・人が触らない時間・手数・$・%・止まった率・夜番の指摘のうち RED になった件数（`docs/claude-usage.md` の「足りないもの」を実績の表へ移す）。

## 11. 組んだもの（11-04、Issue #86）
| ファイル | 中身 |
|---|---|
| `scripts/relay/relay-lib.ts`（＋テスト） | 待ち行列の検査（凍結・共有・秘密を allow に書かせない）、C1〜C5、起動前ゲート、終了後ゲート G0〜G7、費用の読み取り、伏せ字、通知の本文、引数 |
| `scripts/relay/run-day.mjs`・`paths.mjs` | 進行役。`--prepare` で worktree（`<ホーム>\dev\ear-train\Txx`、`npm ci`、push 無効）、列車、`--skip Txx` |
| `scripts/relay/watch.mjs`・`stop.mjs`・`usage.mjs` | 通知係が使う。watch の最後の行は `NOTIFY <本文>`・`QUIET`・`STOP` |
| `scripts/relay/night.mjs`・`night-review.workflow.template.mjs` | 夜番の準備（clone・対象の埋め込み・lock・起動コマンド）と回収 |
| `scripts/relay/PACKET.txt`・`NOTIFIER.txt`・`NIGHT.txt` | 固定の指示文 |

計画（§2〜§6）から変えたこと:
- **手数の上限**: `--max-turns` が無い（2.1.299）ので、進行役が CAGE_LOG の行数を 5 秒ごとに見て、上限を超えたら殺す（`turns`）
- **使用量**: 通知係が `get_usage` の値を `usage.mjs` で `usage.json` に書く（通知係に Write を渡さない）。前夜の値は人が朝に `usage.mjs --night-before N`。3 時間より古い値は読めないものとして止める
- **夜番**: ワークフローはファイルを読めないので、lock は `night.mjs` が持つ。対象のコードは `night.mjs` がワークフローに埋め込み、夜のセッションには Read・Grep・Bash を渡さない。起動は `claude -p`（`--max-budget-usd` で縛る）。寸法は small（Find 4 体）と medium（Find 8 体、Opus の反証 3 件まで）
- **ゲート**: QUESTIONS（ask）を終了コードより先に見る。G2 で GREEN が 1 つも無いときは `claude`（原因不明）として数え、2 本続いたら列車を止める
- **未検証**: ワークフローの中の役が、夜のセッションの道具の制限を受け継ぐか。通知係の入れ子の起動（試運転で確かめる）

### PR #88 のレビュー（`docs/reviews/pr-88-relay.md`）で変えたこと（11-04）
- **置き場**: `%LOCALAPPDATA%\ear-train` をやめて `<ホーム>\dev\ear-train\ops` に。デスクトップアプリから起動したプロセスは `%LOCALAPPDATA%` が別の場所に振り替えられ、ターミナルから起動したものと置き場がずれる
- **二重起動を断る**: 進行役は `running-<MMDD>.json`（プロセス番号）を置き、生きていれば 2 本目を起動しない。ask の通知は「止めるなら『止めて』」だけにし、返事で列車を起動しない
- **STATUS は追記の列**（`status-<MMDD>.jsonl`）。watch は見ていない行をまとめて 1 通にする（続けて止まった 2 本を取りこぼさない）
- **STOP は日付ごと**（`STOP-<MMDD>`）。前の日の STOP が次の日の列車を止めない
- **原因不明の連続**は列車ごとに数える（新しい列車で数え直す）
- **子を木ごと止める**（Windows の `taskkill /T /F`）。檻の server や `npm run check` が残らない
- 凍結の一覧に `.github/`・`.gitattributes`・`wrangler.*`・`next.config.*`・`public/` を足した
- 子に渡す環境変数は 10 個（檻の 7 個に `APPDATA`・`LOCALAPPDATA`・`USERNAME`。claude の認証の置き場を探すため）。§2 の「7 つ」はこれに読み替える
