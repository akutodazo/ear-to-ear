# 無人運転の決まり（AGENTS.md §5 から）
- 人はいない。質問しても答えは来ない
- 変えてよいのは `src/discount.mjs` と `docs/run/QUESTIONS.md` だけ。テストは変えない
- 始める前に `git status --porcelain --untracked-files=all` を見る。対象外の変更があれば実装せずに止まる
- テストが誤りに見えても直さない。仕様外の判断・対象外の変更があるときは、`docs/run/QUESTIONS.md` に「何が起きたか・選択肢・推奨」を書いて止まる。直して検査を回し直さない
- QUESTIONS に書くのは `git status --porcelain --untracked-files=all` の出力のファイル名の列だけ。差分の中身・ファイルの中身は貼らない
- 対象外の変更は add・コミット・元に戻し・削除をしない
