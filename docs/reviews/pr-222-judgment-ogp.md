# PR #222 のレビュー（判断の LINE 通知をサムネイル付きに）

- 見た人: 書いた会話を見ていない別のセッション（Opus 5.5）。AGENTS.md・docs/spec.md・docs/privacy.md を読んでから、`gh pr view 222`・`gh pr diff 222` と、既存の `worker/photo-files.ts`・`worker/status-history.ts` を見た
- 手元で確かめたこと: PR の先頭で `npx vitest run worker/judgment-page.test.ts src/services/judgment-page.test.ts worker/line-notify.test.ts worker/routes.test.ts` → 4 ファイル・43 件が通る。`npm run check` 全体と LINE の実機は見ていない

## 結論
**「止める」の指摘は無い**。新しいページが出すもの（番号・名前・状態・理由の言葉・日時・根拠の写真 1 枚）は、どれも既に合言葉なしで見られるものの一部。撮影位置・距離・メモ・端末 ID は出ない。文書の食い違いが 1 つあるので直すとよい。

## 公開範囲の確かめ
| 出るもの | 前から合言葉なしで見られたか |
|---|---|
| 判断（状態・理由・日時・取り消し） | 見られた。`GET /api/fields/:id/status-events`（`worker/status-history.ts`）がメモ・端末 ID まで含めて全件返している。新しいページはそれより狭い |
| 根拠の写真 | 見られた。`GET /api/photo-files/:id` は認証なし・状態を問わず配る。新しいページは「その畑に確定済み」の 1 枚だけ |
| 撮影位置・距離 | 出ない。写真は Web の道では端末で再エンコード済み、LINE の道（L9）では APP0〜15 を捨てて保存済み。ページは D1 の width/height を読むだけで画像を読まない |

## 指摘
### 1. 直すとよい — `docs/spec.md` の L8 の行が古いまま
spec の段の表（22 行目、L8）に「メモ・**写真**・撮影位置は送らない」が残っている。この PR で `docs/dev/line.md`・`privacy.md`・`decisions.md` は「写真はページの OGP でサムネイルになる」に変えたので、spec だけ食い違う。L8 の行に「根拠の写真の 1 枚目は判断のページ（`/api/judgments/<id>`）の OGP でサムネイルになる（11-07、#220）」と足すとよい。

### 2. 直すとよい — 決定の変え方の確かめ
`decisions.md` の 11-07 は 11-05 の「通知に写真は送らない（AGENTS.md §1）」を変える。11-05 は先輩決定なので先輩が変えること自体は筋が通るが、`privacy.md`（公開範囲）が変わり、「写真」が第三者（LINE の会社のサーバー）に新しく届く道ができる。CLAUDE.md の「決定を変えるときは理由を書いて承認を取る」に従い、本人が承認したことを PR か decisions.md に一言残すとよい（K6・K10・K15 は変えていないので、K の承認は要らないと読んだ）。

### 3. 直すとよい（軽い）— Web の道の写真も LINE の会社に届くことを写真の行にも
新しい行（判断のページ）に「LINE のサーバーが取りに来てサムネイルを作る」とあるが、`privacy.md` の「写真」の行は「R2（非公開、Worker 経由で配信）」のまま。Web から送った写真も、判断の根拠にされると LINE のサーバーに複製されうる。データは架空なので実害は無いが、「写真」の行の「画面に出る」の欄に「判断の根拠の 1 枚目は LINE のサムネイルにも（#220）」と添えると、表だけ読む人が迷わない。

### 4. 気にしなくてよい — 連番の id で全部の判断をたどれる
`/api/judgments/1, 2, 3…` と順に開ける。ただし同じ内容（より多い内容）が `/api/fields/:id/status-events` で既に出ているので、新しく漏れるものは無い。

### 5. 気にしなくてよい — 根拠の 1 枚目が条件に合わないとサムネイルが出ない
1 枚目が未確定・別の畑に訂正済み・R2 から消えたとき、2 枚目以降は見ずに og:image を出さない（消えたときは D1 の行が残っていれば壊れた画像の URL になる）。PR の弱点候補に書いてあり、出ないほうに倒れているので安全側。

### 6. 気にしなくてよい — 取り消しの後も 5 分は古い題が出うる
記録の URL は `public, max-age=300`。取り消し後に記録の URL を開くと最大 5 分「収穫可能」の題が残りうる。取り消しの通知は別の URL（`?revoked=1`）で、ページ自体は D1 を正としているので、実害は小さい。

### 7. 気にしなくてよい — その他確かめたこと
- HTML はすべて `escapeHtml` を通る。CSP は `default-src 'none'; img-src 'self'`、`noindex`・`no-referrer` 付き
- 数でない id・無い id は 404。メモ・端末 ID が出ないことはテストで確かめている
- 共有ファイル（`src/types/`・`src/config.ts`・`AGENTS.md`・`package.json`）・`wrangler.jsonc`・`.github/workflows/**` は変えていない。migration も無い
- 秘密・実データ・画像ファイルは差分に無い
