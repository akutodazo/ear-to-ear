# レビュー: PR #47 T18 Worker の土台

## 対象
- PR: https://github.com/akutodazo/ear-to-ear/pull/47 （`feat/worker-base` → `main`）
- 差分の基準: `git diff origin/main...origin/feat/worker-base`（20 ファイル、+1175／-363）
- コミット: RED 22 本、GREEN `24c8480`、REPORT `0111080`、パスを伏せる `9151a1e`、TASKS の記録

## レビューした者
書いた会話を見ていない別の Claude Code のセッション（Claude Opus 5.5、`claude-opus-5-5`）。受け取ったのは PR の番号と「AGENTS.md と docs/spec.md を読んでから見る」という指示だけ。

## 読んだもの
- `AGENTS.md`、`docs/spec.md`
- 差分の全部: `worker/` の実装 10 ファイル（`deps.ts`・`env.ts`・`index.ts`・`test-helpers.ts`・`router.ts`・`http.ts`・`cookies.ts`・`auth.ts`・`routes.ts`・`app.ts`）、`vitest.config.ts`、`docs/run/TASKS.md`、`docs/run/REPORT.md`。テストは一部（`app.test.ts` など）を拾い読み
- 関係する既存のファイル: `src/services/session-token.ts`、`src/config.ts`（`SESSION_DAYS`）、`tsconfig.json`（`paths`）
- PR の本文

## 手元で確かめたこと
PR のブランチ（`origin/feat/worker-base`）で `npm ci` → `npm run check`。**終了コード 0**。

```
check:safety: 127 ファイルを確認
check:safety: OK（名前・デモの JPEG・圃場の座標・秘密らしい文字列）
✖ 2 problems (0 errors, 2 warnings)
 Test Files  25 passed (25)
      Tests  677 passed (677)
```
lint の警告2つは `src/services/upload-meta.test.ts` の `_removed` と `worker/index.ts` の名前の無い default export（PR 本文の「警告 2」と一致）。

## 結論
**マージを止める問題は無い**。撮影位置・座標はこの PR に出てこない。秘密は `env.ts` で環境から読むだけで、値はリポジトリにも応答にもログにも出ない（Secret が無いときのエラーに出るのは名前だけ）。テストに秘密の名前と値の組は無い。Cookie の形・属性（HttpOnly・Secure・SameSite=Lax・30日）、401／403 の出し分け、失敗の本文を `{ error }` だけにすることは spec §6 と合っている。
ただし、秘密に触る唯一の場所 `env.ts`（合言葉の照合と IP のハッシュ）にテストが無く、`timingSafeEqual` は一度も動いていない。次の `POST /api/session` のパケットの合格条件に入れることを勧める（指摘1）。

## 指摘
| # | 重さ | 内容 | 勧める対応 |
|---|---|---|---|
| 1 | 中 | **`env.ts`（`createDeps`）にテストが無い**。合言葉の照合（admin を先に試す、長さ違いは不一致、`timingSafeEqual`）と `hashIp` は、秘密に触る唯一の場所なのに、確かめたのは `wrangler dev` の health だけ。照合を間違えると「委員の合言葉で管理者になる」「誰でも入れる」が起き、テストの 677 件はどれも捕まえない（`fakeDeps` は `matchPassphrase` を差し替えている） | 次の session のパケットで、`createDeps` に偽の `env` を渡すテストを足す（Node の `crypto.subtle` には `timingSafeEqual` が無いので、テストの中で足す）。admin／member／違う／長さ違い／空文字、`hashIp` が日付と IP で変わること |
| 2 | 低 | **合言葉の長さが時間で漏れる**。`equals` は長さが違うと `timingSafeEqual` を呼ばずに返す。合言葉の長さを推測させる余地がある（10分に5回の制限があるので実害は小さい） | 両方を HMAC（または SHA-256）してから同じ長さの値を `timingSafeEqual` で比べる |
| 3 | 低 | **設定の誤りで全員が管理者になる**。`MEMBER_PASSPHRASE` と `ADMIN_PASSPHRASE` が同じ値だと、`matchPassphrase` は admin を返す | `createDeps` で同じ値なら例外にする（Secret が無いときと同じく 500） |
| 4 | 低 | **Secret が1つ欠けると静的な画面まで 500 になる**。`index.ts` が振り分けの前に `createDeps` を呼ぶので、`/upload` などの画面も出なくなる。中身は漏れないので安全側だが、原因の切り分けが遅れる | 意図どおりならコメントに書く。画面だけでも出したいなら、`/api` の外は `createDeps` の前に `env.ASSETS.fetch` へ渡す |
| 5 | 低 | **REPORT の途中のコミットに手元のパスが残っている**。`0111080` の `docs/run/REPORT.md` に、利用者名を含む手元のフォルダのパス（`C:/Users/<名前>/...`）がある。`9151a1e` で伏せたので、squash でマージすれば main には入らないが、PR のコミットとしては GitHub に残る | squash でマージする（予定どおり）。気になるなら、マージ前にブランチの履歴を書き直す。無人運転の REPORT は、書く前に伏せる仕組みを `scripts/cage` 側に置く |
| 6 | 低 | **将来の CSRF**。いまは SameSite=Lax で、別のサイトからの POST・PATCH に Cookie が付かないので足りる。`Origin` は見ていない | 書き込みのハンドラを作るときに、`Origin` が自分のホストかを見るかを決める（決めないならその理由を decisions に残す） |
| 7 | 軽微 | Cookie 名 `session` は `__Host-` の接頭辞を付けられる形（Secure・Path=/・Domain なし）になっている | `__Host-session` にすると、ほかのサブドメインからの上書きを防げる。手元の `http://localhost` で Secure の Cookie が使えるかは確かめていない |
| 8 | 軽微 | `hashIp` と Cookie の署名が同じ鍵を使う。Cookie の署名の対象は base64url（`:` を含まない）、`hashIp` は `ip:` で始まるので、取り違えは起きない。問題ではないが、理由がコメントに無い | `deps.ts` のコメントに「base64url に `:` が無いので Cookie と衝突しない」と一言足す |

## 決まりとの照合
| 決まり | 結果 | 根拠 |
|---|---|---|
| K6 撮影位置を端末の外に出さない | 対象外（守れている） | 座標・距離を扱う経路はまだ無い。`/api/uploads` は 501 |
| 秘密を入れない・漏らさない | 守れている | 値は `env` から読むだけ。`requireSecret` のエラーは名前だけ。500 の本文は `{ error: "internal" }` だけで、`app.test.ts` が例外の文言が本文に出ないことを確かめている。`check:safety` も OK |
| 実データを入れない | 守れている | 圃場・写真・座標の追加は無い |
| テストの秘密の名前（§1-6） | 守れている | `worker/*.test.ts` に `PASSPHRASE`・`SESSION_SECRET` の文字列は無い |
| spec §6 Cookie・認証 | 合っている | `base64url(JSON).base64url(HMAC)`、30日、HttpOnly・Secure・SameSite=Lax。401（member 以上）／403（admin）。`none` の経路は Cookie を読まない |
| spec §6 合言葉の照合は `timingSafeEqual` | 書かれている（未検証） | 指摘1・2 |
| spec §6 IP は生で保存しない | 口は合っている | `hashIp` は SESSION_SECRET の HMAC と日付。使うのは次のパケット |
| 層の決まり（ハンドラは薄く、判定は Service） | 合っている | Cookie の検証は `session-token.ts`（Service）。`crypto`・時計は `env.ts` だけ |
| 凍結・共有ファイル | 本人の承認待ち | `vitest.config.ts` の `@` の別名（`tsconfig.json` の `paths` と同じ）。PR 本文の「確認したいこと1」 |
| 自動マージ | 付けていない（正しい） | 無人運転・凍結ファイル・別のセッションのレビューが要る PR |

## 「止める」の指摘
なし。
