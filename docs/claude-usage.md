# Claude の使い方の記録

審査の「Claude の活用」（Claude Code を開発の中心に据えて何が可能になったか、モデル・機能を目的に応じて選び分けているか）に答えるための記録。README と動画の材料にする。

書き方: 1行1件、日付つき。**事実だけ**（やったこと・選んだ理由・それで何ができたか）。秘密・実データは書かない。

- **粒度**: 1 PR か1回の実験で1行。コミットごとには書かない
- **証拠**: 行ごとに、後から人が開ける物を1つ以上付ける（PR・コミット・Issue のコメント・`docs/reviews/`・`docs/dev/`）。回数・件数・費用は測った値だけ書く
- **予定と実績**: 表の中に予定を混ぜない。これからのことは「審査の観点との対応」の「足りないもの」に書き、やった後で実績の表に行を足す

## 役割の分け方（いま）
| 作業 | 使うもの | 理由 |
|---|---|---|
| アイデア出し・審査員の目での荒探し | Claude Fable（別のセッション） | 発想を広げる用途。作業中のセッションのモデルは変えない（途中で変えると約束事が崩れた） |
| 設計・テストを書く（RED）・レビュー | Claude Code（Opus、デスクトップアプリ）と人の対話 | 合格条件を人が読んで決める段階 |
| 実装（GREEN） | Claude Code の無人運転（`/goal`、または檻リレー v0.6: `claude -p` に自作の MCP の 5 つの道具だけを渡し、進行役が 1 本ずつ回す。1回に1パケット） | 平日に人が手を出せる時間が短い。テストを凍結し、変えてよいファイルを絞る（AGENTS.md §5） |
| 無人の安全 | `.claude/settings.json` の deny（秘密の読み取り・デプロイ・main への push）＋本人の手元の deny とフック | 人がいない間に秘密・公開・main を触らせない |
| レビュー（撮影位置・実データ・秘密に関わる PR と、提出前の全体） | 書いた会話を見ていない別の Claude Code のセッション（Opus） | 書いた側の考えに引っ張られない。モデルは下げない（日本語と決まりの読み違いを増やさない）。背景を渡さず PR の番号だけ（AGENTS.md §3） |
| 詰まったときの相談 | Claude Fable（新しいセッション） | やり方を変えて3回、または30分で決まらず、判断材料が欠けている・実用になるか判断できないときだけ |
| 凍結の前のテストの攻撃役 | Claude Sonnet（`claude -p`、MCP の檻の中、仕様・決まりのファイルを消した複製） | 手抜きで通せないかを安く何度も試す（1回 $0.07〜0.27） |
| 指示文の試作（キーが入る前） | claude.ai のアーティファクト（ページから Claude を呼ぶ機能） | API のキーを待たずに、架空の記録で指示文の出来を人が見る（引用は API と同じ形の JSON を書かせる疑似） |
| 基本使わない | Codex の点検、サブエージェント（例外: 11-04 の #113 のレビュー。Remote Control から別のセッションを起動できず、先輩の指示で、会話を見ていないサブエージェントにした。11-04 のデプロイの設計の相談。先輩の指示で、読むだけの Fable 5.1 のサブエージェントにした） | 期間が6日と短く、いちばん足りないのは人が確かめる時間。助手の結果を確かめる手間を増やさない。Codex は別の会社のモデルの目が要るときだけ |
| 作品の中の Claude | Claude API（`src/config.ts` の `CLAUDE_MODEL`）、引用（Citations） | 引き継ぎメモの根拠を記録に戻れるようにする（L6） |

## 審査の観点との対応
審査の「Claude の活用」（25%）の3つの観点に、実績だけで答える。11-02 時点、11-04 に先輩側（サーバー）の実績を足した。README と動画はこの節から書く。

### 観点1: 創造的な使い方
| 実績 | 証拠 |
|---|---|
| 無人の Claude から組み込みの道具を全部外し、自作の MCP の4つの道具だけを渡して動かした。実機検証は正常系が成功、直接たたく攻撃 8 種類はすべて拒否。抜け穴（テスト経由の実行）も見つけた | [#14 のコメント](https://github.com/akutodazo/ear-to-ear/issues/14) |
| テストを凍結する前に、仕様を知らない Claude に「ズルで全件通せ」と頼んだ。22 件を全部通す手抜きが書け、テストを足して 47 件にした | [#17 のコメント](https://github.com/akutodazo/ear-to-ear/issues/17)、[#24](https://github.com/akutodazo/ear-to-ear/pull/24) |
| 11-04 の 1 日に、サーバーの 10 本（T22〜T31）を檻リレーで回した。人が書くのはテスト（RED）だけで、実装（GREEN）は人のいない Claude（Opus、8〜22 手）。10 本とも検査 C1〜C5 に合格。T23〜T31 の 9 本の費用は合計 $5.09（API 換算） | `docs/run/TASKS-done.md`・`TASKS.md` の各パケットの「運転の記録」、[#93](https://github.com/akutodazo/ear-to-ear/pull/93)〜[#113](https://github.com/akutodazo/ear-to-ear/pull/113) |
| 攻撃役がパケットごとに手抜きの通り道を見つけ、凍結の前に塞いだ。例: 番号を SQL の文字列に埋め込む（T26）、回数の key をテストの時刻の表で返す・記録を読まず決まった 3 件を返す（T31）、検証を手で写す（T25）、先頭の 1 行だけ検査する（T24） | 各 PR の「攻撃役」、`TASKS-done.md` |
| API のキーを待たずに、claude.ai のアーティファクトを「疑似 API」の試作台にし、Claude in Chrome で先輩の Chrome から本物の Claude に引き継ぎメモを書かせた。記録に指示を混ぜた見本で崩れる所を見つけ、指示文を直した | [#119](https://github.com/akutodazo/ear-to-ear/pull/119) |
| 無人の Claude が、TASKS.md が大きすぎて読めないと分かったとき、推測で書かずに何も変えずに止まり、「項目を切り出す／TASKS を分ける」を推奨した。人が TASKS を分けて起動し直し、2 回目で合格した | [#112](https://github.com/akutodazo/ear-to-ear/pull/112) の検証ログ |

### 観点2: Claude Code を中心に据えて何が可能になったか
| 実績 | 証拠 |
|---|---|
| 仕様の約束事を最初に固定し、キックオフから約2時間で main に `npm run check` が通る状態にした | 下の「記録」の 11-02 の1行目、[#1](https://github.com/akutodazo/ear-to-ear/pull/1) |
| T03 は RED で全件失敗を確かめてから GREEN を4段階で実装した（テスト 54 件、20 コミット） | [#6](https://github.com/akutodazo/ear-to-ear/pull/6) |
| 認証の部品は、書いた会話を見ていない別のセッションがレビューし、期限の上限の抜けを見つけた。攻撃役の2回では見つからなかった | [#24](https://github.com/akutodazo/ear-to-ear/pull/24)、`docs/reviews/pr-24-session-token.md` |
| L6（引き継ぎメモ）のサーバー側を、担当が決まった 11-04 の午後のうちに 5 本の PR（記録を要素に並べる・引用を記録に戻す・保存と読み出し・Claude への要求・POST）で作り、すべてマージした | [#108](https://github.com/akutodazo/ear-to-ear/pull/108)・[#109](https://github.com/akutodazo/ear-to-ear/pull/109)・[#110](https://github.com/akutodazo/ear-to-ear/pull/110)・[#112](https://github.com/akutodazo/ear-to-ear/pull/112)・[#113](https://github.com/akutodazo/ear-to-ear/pull/113) |
| 会話を見ていない別のセッションのレビューが、デプロイの仕組みで 2 回「止める」を出し、2 回とも設計を変えた。PC にトークンを置く案は `/goal` の無人運転に届くのでやめ、Actions では同じジョブのコードから届くのでジョブを分けた | [#122](https://github.com/akutodazo/ear-to-ear/pull/122)・`docs/reviews/pr-122-cloudflare-bot.md`、[#125](https://github.com/akutodazo/ear-to-ear/pull/125)・`docs/reviews/pr-125-deploy-actions.md` |
| 無人の実装を人が受け取る前に、実装をわざと壊してテストが落ちるかを確かめた（T23 10/10・T24 10/11（1 つは結果が同じ書き換え）・T25 12/12・T26 9/9・T27 18/18・T28 14/14・T29 16/16・T30 12/12・T31 15/15）。落ちなかった所からテストの穴を 5 つ見つけて足した（T27 撮影日不明の写真の根拠、T28 type の無いブロック、T29 別の理由で例外になるテスト・時刻が 1 年だけ、T31 範囲の外の引用） | 各 PR の検証ログ |

### 観点3: モデルと機能の使い分け
| 実績 | 目的 | 証拠 |
|---|---|---|
| Fable は発想、Opus は設計・テスト・レビュー、Sonnet は攻撃役、と役で分けた | 発想を広げる用途と、決まりを読み違えない用途を分ける。攻撃役は1回 $0.07（API 換算）で回せる | 上の「役割の分け方」、[#24](https://github.com/akutodazo/ear-to-ear/pull/24) |
| レビューのモデルは下げない。詰まったときだけ Fable に相談する | 確かめる人の手間を増やさない | [#9](https://github.com/akutodazo/ear-to-ear/pull/9) |
| 秘密は `.claude/settings.json` の deny で守り、サブエージェントは調査の1回だけ使った | 機能を増やさず、目的のある所だけ使う | `.claude/settings.json`、下の「記録」 |
| 攻撃役は Sonnet（1回 $0.07〜0.27）、無人の実装は Opus（1本 $0.29〜0.68）、Claude に送る経路と秘密を扱う PR のレビューは会話を見ていない Opus | 安く何度も試す役と、決まりを読み違えない役を分ける | 各 PR の「この PR での Claude の使い方」、`docs/reviews/pr-113-handover-post.md` |
| デプロイの設計（Terraform・bot）は、作業中のセッションのモデルを変えずに、読むだけの Fable 5.1 のサブエージェントに相談した。「提出までは Terraform を入れない」「Terraform に書くのは器と権限、中身は wrangler」の境目を案にもらい、決めたのは人 | 設計の相談は発想を広げる用途（Fable）、作業は Opus のまま | [#122](https://github.com/akutodazo/ear-to-ear/pull/122)、`docs/decisions.md` の 11-04 |
| 作品の中の Claude は、引用（Citations）のカスタムコンテンツで記録 1 件を 1 要素として渡し、返事の要素の番号から元の記録に戻す。考える過程は出さない設定（between_tools）で、上限の 1024 トークンをメモに使う。SDK は入れず fetch で直接呼ぶ | 根拠が必ず渡した記録を指す（K17）。依存を増やさない | [#112](https://github.com/akutodazo/ear-to-ear/pull/112)、[#113](https://github.com/akutodazo/ear-to-ear/pull/113)、[#107 のコメント](https://github.com/akutodazo/ear-to-ear/issues/107) |

### 足りないもの（まだやっていない。実績として読まない）
| 観点 | 足りないもの | 埋める見込み |
|---|---|---|
| 1 | 檻の中でモデルが実装し、攻撃の指示でも何も起きないことの通しの確認 | #14 |
| 2 | 作品の中の Claude（引用付きの引き継ぎメモ）を本物の API で通した実績（11-04 時点ではテストの偽物・手元の 503・試作台の疑似まで） | dev のデプロイ（#125）と `CLAUDE_API_KEY` の登録の後、`docs/dev/l6-live.md` |
| 3 | 使い分けを測った数字。決まりの有無で結果がどう変わるか | #15 |

## PR からの写し方
PR の本文「この PR での Claude の使い方」を正本にする。2人が同じ表を書くと衝突するので、作業の PR ではこのファイルを変えない。

- 写す時: 1日の終わりに1回と、11/7 の提出物の確認の前
- 写す人: その時に手が空いている方。その日にマージされた PR の分を、1つの PR でまとめて写す
- 写す先: 下の「PR から写した記録」。空欄や「なし」の PR は行を作らない

マージ済みの PR の本文を集めるコマンド:
```bash
gh pr list --repo akutodazo/ear-to-ear --state merged --limit 30 --json number,title,mergedAt,body
```

## PR から写した記録
11-04 の分は先輩の PR だけ（先輩が写した）。本人の PR（#95〜#98・#101・#103・#114〜#117・#120・#121）は本人が写す。片付けだけの #126 は行を作らない。

| 日付 | PR | 何を | モデル | 機能 | なぜ | 人が決めた・直したこと | 何ができたか |
|---|---|---|---|---|---|---|---|
| 11-02 | [#6](https://github.com/akutodazo/ear-to-ear/pull/6) | T03 `jpeg-segments`（APP1〜15 の検出と幅・高さ） | Claude Opus | Claude Code の対話 | 無人運転に回さない先輩の担当で、合格条件を人が読みながら決める | Issue を毎回立てる、コミットを観点ごとに分ける、点検なしで PR にする | テスト 54 件。RED が全件失敗を確かめてから、GREEN を4段階で実装。20 コミット |
| 11-02 | [#24](https://github.com/akutodazo/ear-to-ear/pull/24) | T05 `session-token`（Cookie の発行と検証） | Claude Opus、Claude Sonnet | 対話、別のセッションの攻撃役（`claude -p`、MCP の道具だけ）、別のセッションのレビュー | テストを凍結する前にズルで通せないかを試す。認証の部品なので独立レビューの対象 | 指摘の採否（仕様の範囲のものだけテストにした） | RED 47 件、GREEN 3段階、レビュー後 56 件。攻撃役の費用は1回目 $0.07（API 換算） |
| 11-04 | [#93](https://github.com/akutodazo/ear-to-ear/pull/93) | T23 判断の取り消し | Claude Opus 5.5、Claude Sonnet | 対話、攻撃役、無人運転（檻リレー） | 人がいなくても実装を進める | RED と決めること | 15 手 $0.51、壊して 10/10 |
| 11-04 | [#94](https://github.com/akutodazo/ear-to-ear/pull/94) | T24 地図用の各圃場のまとめ | 同上 | 同上（攻撃役 3 回） | 同上 | 共有の型 `FieldSummary`（本人の承認） | 13 手 $0.53、壊して 10/11 |
| 11-04 | [#100](https://github.com/akutodazo/ear-to-ear/pull/100) | T25 判断を残す POST | 同上 | 同上（攻撃役 3 回） | 同上 | 決めること 3 点 | 18 手 $0.67、壊して 12/12 |
| 11-04 | [#102](https://github.com/akutodazo/ear-to-ear/pull/102) | T26 判断の履歴 | 同上 | 同上（攻撃役 3 回） | 同上 | 端末 ID を返す（privacy に書いた） | 11 手 $0.52、壊して 9/9 |
| 11-04 | [#108](https://github.com/akutodazo/ear-to-ear/pull/108) | T27 記録を引用用の要素に並べる | 同上 | 同上（攻撃役 2 回） | 同上 | 撮影日不明の写真の根拠の抜けを人が直した | 10 手 $0.68、壊して 18/18 |
| 11-04 | [#109](https://github.com/akutodazo/ear-to-ear/pull/109) | T28 返事の引用を記録に戻す | 同上 | 同上（攻撃役 1 回） | 同上 | 返事の形を公式の文書で確かめた | 8 手 $0.49、壊して 14/14 |
| 11-04 | [#110](https://github.com/akutodazo/ear-to-ear/pull/110) | T29 引き継ぎメモの表と GET | 同上 | 同上（攻撃役 2 回） | 同上 | テストの穴 2 つを直した | 15 手 $0.66、壊して 16/16 |
| 11-04 | [#112](https://github.com/akutodazo/ear-to-ear/pull/112) | T30 Claude への要求と返事の判定、TASKS の分割 | 同上、claude.ai のアーティファクト | 同上（攻撃役 1 回）、試作台 | 同上 | 指示文は人が書いた。止まった運転を人が直して起動し直した | 2 回目 11 手 $0.29、壊して 12/12 |
| 11-04 | [#113](https://github.com/akutodazo/ear-to-ear/pull/113) | T31 引き継ぎメモを作る POST | 同上、会話を見ていないサブエージェント（Opus） | 同上（攻撃役 2 回）、レビュー | 同上。Claude に送る経路と秘密なのでレビュー | Claude の口の配線は人が書いた。レビューの指摘 2 つを直した | 22 手 $0.63、壊して 15/15、レビューの「止める」なし |
| 11-04 | [#118](https://github.com/akutodazo/ear-to-ear/pull/118) | L6 を本物の Claude で 1 回通すスクリプトと手順書 | Claude Opus 5.5 | 対話 | 本人の手数を最も少なくする（先輩の指示） | コマンド 1 つ・聞くのは 3 つまで | `node scripts/ops/l6-live.mjs` 1 回で表・秘密・デプロイ・POST まで。手元の `wrangler dev` で 401・503 を確かめた |
| 11-04 | [#119](https://github.com/akutodazo/ear-to-ear/pull/119) | 引き継ぎメモの指示文を直す | Claude Opus 5.5、claude.ai のアーティファクトの中の Claude | 対話、Claude in Chrome（先輩の Chrome を操作）、試作台 | キーを待たずに本物の Claude で指示文を試す | 足すかどうか（先輩）。試すのは架空の記録だけ | 記録に指示を混ぜた見本で、指示の扱いの説明と根拠の無い否定の文が出た。3 回の書き換えと 5 回の試しで、根拠の無い文 0/3 |
| 11-04 | [#122](https://github.com/akutodazo/ear-to-ear/pull/122)・[#123](https://github.com/akutodazo/ear-to-ear/pull/123) | PC にトークンを置く Cloudflare の bot（後で #125 に置き換え） | Claude Fable 5.1（読むだけのサブエージェント）、Claude Opus 5.5 | 設計の相談、対話、会話を見ていない別のセッションのレビュー | Terraform と bot をどう入れるか。秘密に関わるのでレビュー | Terraform は入れない（Fable の案）。範囲は dev と demo（本人） | レビューが「止める」1（`/goal` の無人運転にトークンが届く）・直す 4 を出し、PC に置く形をやめた |
| 11-04 | [#125](https://github.com/akutodazo/ear-to-ear/pull/125) | main へのマージで dev にデプロイ（demo は人が押す） | Claude Opus 5.5 | 対話、会話を見ていない別のセッションのレビュー | 秘密を Actions に置くのでレビュー | Actions にする・dev は自動・demo はボタン（本人と先輩） | レビューが「止める」1（同じジョブで動くコードからトークンに届く）を出し、コードを動かすジョブと秘密を持つジョブを分けた。workflow・wrangler・package を変える PR を自動マージの例外にした |
| 11-04 | [#127](https://github.com/akutodazo/ear-to-ear/pull/127) | 安全検査に Claude と Cloudflare の秘密の名前とトークンの形 | Claude Opus 5.5 | 対話 | 会話にトークンが貼られた（値は作り直し済み）ので、リポジトリに入る道も塞ぐ | 足すこと（先輩） | RED 5 件 → GREEN |
| 11-04 | [#128](https://github.com/akutodazo/ear-to-ear/pull/128) | 合言葉の失敗のときに古い回数の行を消す（#59） | Claude Opus 5.5 | 対話 | 残りの片付け | 失敗のときに消す（定時処理にしない、先輩） | RED 2 件 → GREEN |

## 記録
| 日付 | 何を | 使ったもの | 選んだ理由 | それで何ができたか |
|---|---|---|---|---|
| 11-02 | 初期化（T00）: Next.js・Vitest・CI・AGENTS.md・docs | Claude Code（Opus） | 仕様書から約束事（型・定数・層の決まり）を最初に固定する | キックオフから約2時間で main に `npm run check` が通る状態 |
| 11-02 | GitHub の設定（Ruleset・Secret scanning・ひな形など） | Claude Code ＋ `gh` の API | 画面の操作を減らす。変える前に人が中身を見て承認 | main は PR と CI が必須、秘密の push は止まる |
| 11-02 | 架空の圃場の範囲（P15） | Claude Code ＋ 国土地理院の標高 API | 実在の土地に重ならないことを数字で確かめる | 沖合の四角（海）に 12 圃場、地図タイルなしの架空の村 |
| 11-02 | 「もう一つの新しいこと」のアイデア出し（3回） | Claude Fable（別のセッション） | 発想を広げる用途にモデルを分ける | 案 10 個以上と採点。本人の反論（「人の手間が増えるのは欠点」）で推奨が M2 → N7／N1 に変わった |
| 11-02 | 審査基準（キックオフ）による見直し | Claude Code（Opus） | 基準と案の対応を表にする | 推奨は変えず、開発のしかたをこの記録に残すと決めた |
| 11-02 | T02 の RED（候補の圃場のテスト 13 件と空の実装） | Claude Code（Opus）と人の対話 | 無人運転に渡す前に、合格条件をテストとして人が読んで凍結する | 仮の実装で 13 件が通ることを確かめてから空に戻した（無人運転が「満たせないテスト」で止まらないように）。GREEN は無人運転の試験1（予定） |
| 11-02 | 前の防災ハッカソンのリポジトリの調査（設計の固め方・Claude の使い方） | Claude Code のサブエージェント（Opus のまま、読み取りだけ） | 2つのリポジトリを広く読む作業を、作業中の会話に入れない | 約10万トークン分の読み取りが2千字のまとめで届いた。学んだこと: 動かない仕組みを作らない、検証役は読み取りだけ |
| 11-02 | 使い分けの決まり（レビュー・詰まったとき・基本使わないもの） | 人と Claude Code（Opus）の議論 | 期間が短く、人が確かめる時間がいちばん足りない | レビューは別の Opus のセッション、詰まったときだけ Fable、Codex とサブエージェントは基本使わない（AGENTS.md §3） |
