# PR #32 のレビュー（T11 0001_init.sql と SQL のテストの仕方）

- 対象: akutodazo/ear-to-ear#32、コミット `15203a2`（`migrations/0001_init.sql`、`worker/migrations.test.ts`、`docs/spec.md`、`docs/run/HOLES-T11.md`）
- レビューした者: 書いた会話を見ていない別の Claude Code のセッション（Claude Opus 5.5）。AGENTS.md §3 の決まりによる
- 読んだもの: `AGENTS.md`、`docs/spec.md`、PR の本文と差分、Issue #27、`docs/decisions.md`、`docs/privacy.md`、`docs/dev/holes.md`、`src/types/index.ts`

## 結論
**マージを止める問題は無い。** 表に撮影位置・距離・水分の列は無く、SQL は spec §5 と一致する。PR の検証ログの数字はすべて再現した。手元の D1 でも流れた。

ただし次の1つは対応を勧める。

1. 撮影位置の検査が `0001_init.sql` しか見ていない（指摘 1）。**次のマイグレーションで座標の列を足しても 48 件すべて通る**。`0002` は L6 で作る予定

「本人に確認したいこと」の1（`usage_counters` の移動）は、本人の承認が済むまでマージしない。

## 指摘
| # | 重さ | 内容 | 勧める対応 |
|---|---|---|---|
| 1 | 中 | K6・K16 の検査が `0001_init.sql` だけを流した DB を見る。`migrations/0002_x.sql` に `lat`・`lng` の列を持つ表を足しても 48 件すべて通った | 「持ってはいけない列」だけ、`migrations/*.sql` を名前順に全部流した DB で調べる。他のテストは `0001` のままでよい |
| 2 | 低 | spec の見出しを `0002_handover.sql（L6）` に変えたが、同じ節の `settings`（`line_group_id`）は L8 で使う | `（L6・L8）` に直す |
| 3 | 低 | `docs/dev/holes.md` は破り役を Opus とし、記録に条項ごとの「破れた／縛られた」と全件通過の出力、人が先に書く一覧を求める。今回は Sonnet で、`HOLES-T11.md` には 11 条項の一覧も無い。11-02 の決定の理由「モデルを下げずに独立した目を持てる」とも違う | Sonnet を選んだ理由を PR に書き、11 条項の一覧を `HOLES-T11.md` に足す。手順を変えるなら `holes.md` を直す |
| 4 | 低 | `candidate_field_ids` は「番号だけ。距離は持たない」と書いてあるが、表の制約は `NOT NULL` だけ。`[{"id":"A-01","dist":120}]` も入る。守るのは受け口だけで、`HOLES-T11.md` の「受容する穴」に書かれていない | 表は今のままでよい。「受容する穴」に足す。受け口は検証済みの値から書き直して保存する（下の申し送り） |

## 「本人に確認したいこと」への意見（決めるのは人）
1. **`usage_counters` を `0001` に移す**: 賛成。§6 の `POST /api/session` の 429 は L0 で、その回数をこの表に持つ。L6 の `0002` に置いたままでは L0 が作れない
2. **`usage-limit` の担当**: 受け口を作る先輩が持つ案に賛成。ただし AGENTS.md §2 は「後で決める（L0 が終わった時点）」のままで、L0 に要る事実と食い違う。共有ファイルなので、両方の承認を取って別の PR で直す

## 弱点候補への回答
| 候補 | 回答 |
|---|---|
| 1. spec の SQL そのものの誤り | §5 を §4・§6・§9 と型（`src/types/index.ts`）に照らして読み、誤りは見つからなかった。主キーの `NOT NULL` は `id INTEGER PRIMARY KEY` には要らないので、付けていないのは正しい |
| 2. 書き方を変えただけで落ちる | そのとおり。ブロックコメント1つで落ちた。行コメントの変更は通った。正本との一致を守る目的に合うので、受容してよい |
| 3. `node:sqlite` と D1 の差 | 手元の D1（wrangler 4.156.1）に `d1 migrations apply --local` で流した。7 文が成功し、PR の `d1 execute` とは別の経路でも問題なし。外部キーは有効で、無い写真への履歴を拒否、`usage_counters.key` の NULL を拒否、UPSERT で 2 まで数えた。Cloudflare 本番では流していない |
| 4. 3回目の攻撃をしていない | 下の変異の試験で代わりに確かめた。一致のテストと列の一覧が効いている。抜けたのは指摘 1 だけ |

## 受け口を作るときへの申し送り
- **K6**: `candidate_field_ids` には `meta` の値をそのまま入れない。検証済みの番号の配列から `JSON.stringify` し直す（指摘 4）
- **公開 API**: `GET /api/photos` と `/recent` は合言葉なしで読める。`SELECT *` にしない。`content_hash` と `uploader_device` は `docs/privacy.md` で「出さない」。型 `UploadedPhoto` は `uploaderDevice` を持つので、公開の応答に載せるかを決める
- **状態と番号**: 表は `state='confirmed'` で `field_id` が NULL の行も入る。`state` と `field_id` を同じ UPDATE で変える
- **期限切れの行**: `usage_counters.expires_at` を読む処理が決まっていない。ログインの行は IP のハッシュと10分の枠ごとに増えるので、消す時機を `usage-limit` の中で決める
- **エラーの文言**: 手元の D1 の UNIQUE 違反は `UNIQUE constraint failed: uploaded_photos.content_hash: SQLITE_CONSTRAINT (extended: SQLITE_CONSTRAINT_UNIQUE)` で、`node:sqlite` の文言の後ろに続きが付く。T08 で判定するときは完全一致で比べない

## 決まりとの照合
| 項目 | 結果 |
|---|---|
| 撮影位置（K6） | 表に座標・距離の列は無い。候補は番号の JSON 配列。指摘 1・4 のほか問題なし |
| 水分（K16） | 水分の列は無い |
| 実データ（K10） | 差分に画像・CSV・実在の値は無い。テストの値は `A-01`・`dev-0001` など架空 |
| 秘密 | 合言葉らしい文字列は無い。`usage_counters` のキーは生の IP ではなくハッシュ（§6、`docs/privacy.md` と一致） |
| 二重登録（K7） | `content_hash` の UNIQUE は1列だけで、圃場にも端末にも依存しない |
| 層の決まり（§4）・担当（§2） | `worker/` と `migrations/` は先輩の範囲。共有ファイルの変更は無い。`any` などの禁止事項は無い |
| 例外のテスト（§3） | `toThrow` はすべて正規表現つき |
| RED と GREEN の分離 | 分かれている。RED の16コミットのうち実装に触るのは空のファイルを置く最初の1つだけ。GREEN は `0001_init.sql` だけを変える |
| 既存コードの持ち込み（§1） | **確かめていない**。比べる元のコードを見ていない |

## 確かめたこと
- **CI**: `check` は `15203a2` で成功（Node 24）
- **件数**: 最終のテストを各コミットの SQL にかけた。空の SQL は 46 件失敗・2 件成功。GREEN は 25 → 33 → 42 → 48 件で、PR の記載と一致
- **手元**: Node 25.9.0 で 48 件成功、`tsc --noEmit` はエラーなし
- **変異の試験**: PR の SQL を手で壊して 48 件にかけた

| 変えた所 | 結果 |
|---|---|
| 別のファイル `0002_x.sql` に `lat`・`lng` の表 | **48 件すべて通る**（指摘 1） |
| `0001` に `COLLATE NOCASE` | 1 件落ちる（spec との一致） |
| `0001` にブロックコメント | 1 件落ちる（spec との一致） |
| `0001` の行コメントだけ変える | 通る（動きは変わらない） |
| `0001` と spec の両方に `lat REAL` | 3 件落ちる |
| `0001` と spec の両方に `meters REAL` か `shoot_pos TEXT` | 2 件落ちる（列の一覧。`lat` の正規表現には当たらない） |

- **一致のテストの抜け道**: 行コメントを消す処理が SQL の中身まで消す形を探した。`--` の前の文字列が spec と同じでなければ一致しないので、実行される SQL を隠す方法は見つからなかった
- **確かめていないこと**: 攻撃役の SQL を最終のテストにかけた結果（PR 本文の「1回目は 4 件、2回目は 3 件落ちる」）。手元に実物が無いため。`npm run check` の全体は手元で回していない（CI の成功で代える）。Cloudflare 本番での実行
