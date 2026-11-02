---
name: role-brief
description: レビュー役・攻撃役・来年の委員役・人の役を、許可したファイルだけのフォルダで別のセッションとして起動する。役に会話の経緯を渡さないときに使う
---

# 役を起動する

一覧と理由は `docs/dev/roles.md`。経緯を文面に足さない。文面は `PROMPT.txt` をそのまま使う。

1. 役と引数を確かめる（`attacker`: `--impl`・`--test`、`reviewer`: `--pr`、`committee`: `--memo`、`human`: `--questions`）
2. リポジトリの外に、空のフォルダを決める
3. `node scripts/roles/build-brief.mjs <役> <引数> --out <フォルダ>` を実行する
4. `<フォルダ>/work` の中身を一覧にして、許可したものだけかを人に見せる
5. `<フォルダ>/work` を作業フォルダにして起動する

   ```bash
   claude -p "$(cat ../PROMPT.txt)" --setting-sources project --strict-mcp-config --no-session-persistence --model <モデル>
   ```

   道具は役に合わせて絞る。攻撃役は `docs/dev/cage.md` の檻の中で動かす。

6. 結果をそのまま人に渡す。テストや決定への反映は人が決める
