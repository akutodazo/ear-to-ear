# 先行事例の調査（ハーネス v0.6「檻リレーと夜番」）

目的: `docs/dev/harness-v0.6-relay.md` §10 の「世界初」を、根拠付きで言えるかを確かめる。
調べた日: 2026-11-03。調べた人: 先輩のセッション（Claude Code、Opus 5.5）。
範囲: Web 検索 11 回（英語、通常の検索）と記事 1 本の読み取り。論文（arXiv）・GitHub・ブログ・プラグインの一覧。**日本語の検索、GitHub のコード検索、深い検索はしていない**。

## 結論
- **部品は全部、先例がある**（下の表）。部品ひとつを「世界初」とは言えない。
- **見つからなかったもの**: 次を一つの輪にした例。
  1. 夜に多視点で探して反証にかけた指摘を、**人が失敗するテスト（RED）にして凍結**し、翌日に**無人の Claude が GREEN だけを書く**
  2. その無人の Claude には組み込みの道具を一つも渡さず、自作の道具だけを渡す
  3. 進行と合否は LLM を呼ばないゲートで決め、止まったものは再開せず残りを続け、人に聞くことだけをスマホに届ける
- 言い方の案: 「**調べた範囲（2026-11-03、Web 検索 11 回）では、〜を一つの輪にした前例は見つからなかった**」。11/6 に日本語と GitHub を足してもう一度調べ、それでも無ければ世界初と打ち出す。

## 部品ごとの先例
| 部品 | 先例 | 私たちとの違い |
|---|---|---|
| 夜に無人で回す、待ち行列、テストのゲート | [Nightshift](https://dev.to/orwamahmoud/why-claude-code-stops-halfway-through-long-tasks-and-the-harness-i-built-to-keep-it-moving-532o)（Markdown の作業リスト、Stop フックで終わらせない、`git push` の禁止、差分の秘密検査、質問は朝に回す）、[claude-overnight](https://pypi.org/project/claude-overnight/0.4.0/)、[nightshift-cli](https://pypi.org/project/nightshift-cli/0.3.0/)、[Jean Galea の手順](https://jeangalea.com/claude-code-overnight/) | テストは人が書いて凍結し、無人は GREEN だけ。組み込みの道具を渡さない。質問はその場でスマホへ。使用量の扱いは無い |
| テストを先に書かせるゲート | [TDD Guard](https://github.com/nizos/tdd-guard)（PreToolUse フックで RED が無い実装を止める）、[overnight-dev](https://agentskill.sh/plugins/jeremylongshore/overnight-dev)（テストが通るまでコミットさせない。テストは Claude が書く） | どちらもテストを書くのは Claude。私たちは人 |
| LLM を呼ばない進行役、失敗を飛ばして続ける | [Bernstein](https://bernstein.readthedocs.io/en/latest/architecture/WHY_DETERMINISTIC/)（コードの待ち行列と状態機械、品質ゲート）、[zeph-orchestration](https://docs.rs/crate/zeph-orchestration/0.22.4/source/README.md)（失敗時に skip、依存先も skip）、[AgentEnsemble](https://agentensemble.net/design/20-deterministic-only/) | 考え方は同じ。違いは、檻・人の凍結テスト・使用量のゲートと組んでいること |
| 組み込みの道具を外す | [hyperhive のコミット](https://git.berlin.ccc.de/vinzenz/hyperhive/commit/8e7405db13b3e2fbdb1e0679dbbac97820b5a0b8)（`--tools` で組み込みを絞る。後に deny 方式へ戻した） | 私たちは組み込みを空にし、純粋関数の検査付きの自作 5 道具だけ |
| 多視点で探して反証にかける | [Refute-or-Promote](https://arxiv.org/abs/2604.19049)（2026-04、反証役で候補の約 79% を落とす）、[AEGIS](https://papers.cool/arxiv/2603.20637)、[AnyPoC](https://www.alphaxiv.org/abs/2604.11950)、[ZEUS](https://zeus.certora.com/posts/intro-zeus-audit) | 手法そのものは先例どおり。違いは、出力を「人が RED にする材料」にして翌日の無人運転に戻すこと。直さない |
| 指摘を回帰テストにして直す | [address-code-review](https://raw.githubusercontent.com/cipherstash/skills/607521a0c66722a95a6f5cb4e03a22b0cb23870b/plugins/company-skills/skills/address-code-review/SKILL.md)（確かめた欠陥を red-first で直す。テストもエージェント）、[review-then-implement loop](https://www.agentpatterns.ai/code-review/review-then-implement-loop/) | テストを書いて凍結するのが人、という一点が違う。[Imbue の報告](https://imbue.com/blog/2026-04-29-how-ai-code-review-can-make-correct-code-worse)（直す役がテストを足しつつ正しい計算を壊した）が、人が凍結する理由の裏付けになる |
| 使用量で止める | [usage-guard](https://github.com/ManvikPasula/usage-guard)（週次 98% などで一時停止）、[claude-usage](https://github.com/Dede98/claude-usage)（80% で PID に SIGTERM）、[rate-limit-guard](https://www.claudepluginhub.com/plugins/willyt3hwhale-rate-limit-guard) | 先例は「上限の手前で止める」。私たちは「締切までの日割りの累積上限（前夜 + 14%）」を起動前に見る。違いは小さいので、ここを世界初の柱にしない |
| 人に聞くことだけスマホへ | Claude Code の Remote Control の公式機能（「Push when actions required」） | 機能そのものは公式。新しさは無い |

## §10 への反映
- 柱は「**夜の反証 → 人が凍結する RED → 無人の GREEN** の閉じた輪」と、その輪を檻・LLM を呼ばないゲートで回すこと
- 「使用量を起動前ゲートに入れる」は先例があるので、柱から外して「工夫」として書く

## まだ調べていないこと（11/6 にやる）
- 日本語の記事・発表（Zenn、Qiita、note、Speaker Deck）
- GitHub のコード検索（`--tools ""` と `--strict-mcp-config` を一緒に使っている例）
- 深い検索（`extended`）で、上の輪に近いものを 1 回
