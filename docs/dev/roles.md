# 忘れた Claude（役ごとに知らせないこと）

Issue: akutodazo/ear-to-ear#16。**状態: 提案（11-02）。本人の承認待ち。**

指示で「無視して」と言っても、見えたものは消せない。だから、知らせないものは**物理的に置かない**。役ごとに空のフォルダを作り、許可したファイルだけを置いて、固定の文面で別のセッションを起動する。サブエージェントは使わない（AGENTS.md §3）。

## 役の一覧
| 役 | 渡すもの | 知らせないこと | 知らせない理由 |
|---|---|---|---|
| レビュー役（`reviewer`） | リポジトリの複製、PR の番号 | 会話、背景、経緯 | 書いた側の考えに引っ張られない（AGENTS.md §3） |
| 攻撃役（`attacker`） | テスト、空の実装、`src/types/`、`src/config.ts` | 仕様、本物の実装、経緯 | 仕様を知らない Claude が見つけた抜けは、テストだけでは仕様が伝わっていない所（#17） |
| 来年の委員役（`committee`） | メモだけ | リポジトリ、記録、作った経緯 | メモだけで次の人が動けるかを確かめる |
| 人の役（`human`） | QUESTIONS.md だけ | 運転の記録、差分 | 止まった報告が、それだけで読めるかを確かめる（#19） |

## 使い方
Skill `role-brief`（`.claude/skills/role-brief/SKILL.md`）か、次のコマンド:

```bash
node scripts/roles/build-brief.mjs attacker --impl src/services/session-token.ts --test src/services/session-token.test.ts --out <空のフォルダ>
```

`<out>/work/` に渡すファイル、`<out>/PROMPT.txt` に文面ができる。`work` を作業フォルダにして `claude -p` を起動する。手元の設定が混ざらないよう `--setting-sources project` を付ける。

## 仕組みで守っていること
- 文面は `scripts/roles/build-brief.mjs` に固定。経緯を足す引数は無く、知らない引数はエラーになる
- 攻撃役の実装は `stub-impl.mjs` が空にする。`git show HEAD:` から読むので、コミットしていない手元の変更も渡らない
- 空でないフォルダには作らない

## 守れないこと
- レビュー役の複製にはコミットの履歴（`--depth 1` で1件）と `docs/` が入る。`docs/claude-usage.md` の記録は読める。AGENTS.md §3 の「背景を渡さない」は文面の話として扱う
- `--setting-sources project` を付け忘れると、手元の設定とメモリーが混ざる
