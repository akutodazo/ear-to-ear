# 仕様（ear-to-ear）

期間前に文章で書いた設計を元に、期間中に書き直していく。11/3 の公式セッション「仕様の言語化: Known／Unknown」を受けて、Known と Unknown を分ける予定。決定の理由は `docs/decisions.md`、公開範囲は `docs/privacy.md`。

## 1. 一文で
**委員が合言葉を入れて写真を送るだけで、圃場番号の候補と撮影日が付いて全員に共有される。番号が決まらなくても「未確定（推定 ○○）」として先に共有し、管理者が確定・訂正する。判断（収穫可能／収穫済）とその理由（農協の判定を含む）も、同じ地図に残る。**

## 2. 成功の定義
「一人が取り込まなくても、委員が送った写真が別の委員の端末に届く（撮影位置が取れれば番号の候補付き、取れなければ『未確定』として届き、管理者が番号を付ける）。目的の畑・日付の写真を見つけられる。間違いは直せる。判断とその理由を後からたどれる。公開側に正確な撮影位置（座標、候補の畑までの距離）は残らない」

**共有の完了と番号の確定は別**。位置が取れない写真は、共有はすぐ・番号は管理者待ち。

### 作らないもの
子実水分の推定、農家名の表示、収穫順・台数の自動決定、オルソ画像、個人アカウント・メール認証、既存サイトとの連携、スマホのネイティブアプリ。

## 3. 段（実施順。L0 が終わるまで他に手を付けない）
| 実施順 | 段 | 内容 | 目安 |
|---|---|---|---|
| 1 | **L0（必須）** | 合言葉（委員／管理者）、送る（ブラウザで前処理 → Worker が検査・保存）、新着一覧（未確定・確定、手動更新）、確定・訂正（履歴）、二重登録・日付不明、公開リポジトリの安全の仕組み、架空データ、開発用 Worker（HTTPS）での実機確認 | **11/4 夜まで** |
| 2 | **L1** | 地図（番号ピン、未確定の写真がある圃場に印）、圃場ページ（撮影日ごと・日付不明は別枠）、判断ボタン（収穫可能／収穫済）に理由と根拠を付ける: 理由の選択肢（複数）＋短いメモ＋根拠の写真。取り消し。理由の選択肢に「農協の判定で中止（水分超過）」「同（砕けなどの傷）」を必ず入れる | 11/5 |
| 3 | **L6（Claude の活用の中心）** | 圃場ごとの写真・判断から、次の年の委員が読める短い引き継ぎメモを作る。Claude API の引用（Citations）で各文に根拠の記録を付け、画面から元の記録に戻れる。記録に無い理由は「記録なし」 | 11/6 |
| 4 | **L8** | LINE でお知らせ（片方向、Messaging API）。ハッカソンでは架空のグループにだけ送る | 11/6〜7 |
| 5 | L5（実験） | 位置の無い写真について、人が選んだ候補2〜3圃場の写真と見比べて理由付きで並べ替える。確定は人。精度は主張しない | 時間があれば |
| 6 | L4 | Android の共有メニューから送る（Web Share Target） | 時間があれば |
| 7 | L9 | LINE から写真を受け取る | 後回し |

やめた段: L2（水分の手入力）・L3（水分の紙の読み取り）— K16。

## 4. 流れ（L0）
```text
[スマホのブラウザ /upload]（HTTPS 必須。Cookie の Secure と crypto.subtle は HTTPS でしか動かない）
  1. 合言葉 → POST /api/session → Cookie（端末 ID・役割）
  2. 写真を選ぶ（複数可）
  3. ブラウザ内で: XMP/EXIF から撮影位置・日時を読む（位置は送らない）
                  → 圃場一覧の位置から候補を計算（最大3、近い順）。距離は画面に出すだけで送らない
                  → 長辺1600pxに縮小・JPEG 再エンコード（メタデータは全部消える）
                  → 元ファイルの SHA-256
  4. POST /api/uploads（縮小画像＋{日時, 日時の出どころ, 候補の番号, ハッシュ, 任意の番号}）
[Cloudflare Worker]
  5. Cookie を検証 → 画像に APP1〜APP15 が無いことを検査 → ハッシュで二重を確認（あれば 409）
  6. R2 に保存 → D1 に「未確定」で記録 → 201
     ・D1 の UNIQUE 違反（同時に送られた二重）→ R2 の画像を消して 409
     ・D1 がその他の理由で失敗 → R2 の画像を消して 500（孤立した画像を残さない）
[管理者の確定・訂正]
     ・番号の更新と履歴の追加は D1 の batch で一度に行う
[閲覧（合言葉なし）]
  7. 新着・圃場ページが GET /api/photos を読んで表示
```

### 写真の位置情報（分かっている事実）
- DJI の写真は位置と日時を EXIF ではなく **XMP** に持つ（`drone-dji:GpsLatitude`、`drone-dji:GpsLongitude`、綴り違いの `drone-dji:GpsLongtitude` がある機種もある、`xmp:CreateDate`）。EXIF の GPS 欄と DateTimeOriginal は無い
- Android の Chrome: スマホのカメラ写真の EXIF の位置はブラウザに渡る時点で 0/0 に消される。DJI の XMP の位置は残る
- iPhone／iPad の Safari: 実機は未確認（P2）。iOS 17 以降は写真の選択画面の「オプション」で位置を渡すかを選べる。位置が届かない場合は普通にあると考え、「位置なし」として受け付け、番号は管理者が付ける
- 読み取りは EXIF と XMP の両方。EXIF の位置が 0/0（NaN）や 0,0 なら「消されている」として null
- 公開側に残してよいメタデータは無い。縮小・再エンコードで全部消し、Worker でも APP1〜APP15 が無いことを検査する

## 5. データ契約
型は `src/types/index.ts`、定数は `src/config.ts`（どちらも共有ファイル）。圃場番号は架空データで `A-01` の形。

### D1（`migrations/`）
```sql
-- 0001_init.sql（L0〜L1）
CREATE TABLE uploaded_photos (
  id TEXT PRIMARY KEY,
  field_id TEXT,
  state TEXT NOT NULL CHECK (state IN ('unconfirmed','confirmed')),
  candidate_field_ids TEXT NOT NULL,          -- JSON 配列（番号だけ。距離は持たない）
  taken_at TEXT,
  taken_at_source TEXT NOT NULL CHECK (taken_at_source IN ('xmp','exif','none')),
  content_hash TEXT NOT NULL UNIQUE,
  r2_key TEXT NOT NULL,
  width INTEGER NOT NULL, height INTEGER NOT NULL, bytes INTEGER NOT NULL,
  uploader_device TEXT NOT NULL,
  uploaded_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX idx_photos_field ON uploaded_photos(field_id, taken_at);
CREATE INDEX idx_photos_uploaded ON uploaded_photos(uploaded_at);
CREATE TABLE photo_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  photo_id TEXT NOT NULL REFERENCES uploaded_photos(id),
  from_field_id TEXT, to_field_id TEXT NOT NULL,
  actor_device TEXT NOT NULL, at TEXT NOT NULL
);
CREATE TABLE field_status_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  field_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ready','done')),
  reasons TEXT NOT NULL DEFAULT '[]',         -- JSON 配列（選択肢のコード）
  note TEXT,
  ref_photo_ids TEXT NOT NULL DEFAULT '[]',
  actor_device TEXT NOT NULL, at TEXT NOT NULL, revoked_at TEXT
);
-- 0002_handover.sql（L6・L8 の上限）
CREATE TABLE handover_notes (
  field_id TEXT NOT NULL, season TEXT NOT NULL,
  body TEXT NOT NULL,                         -- JSON（HandoverNote の records と blocks）
  model TEXT NOT NULL, created_at TEXT NOT NULL,
  PRIMARY KEY (field_id, season)
);
CREATE TABLE usage_counters (                 -- Claude の呼び出し回数・LINE の送信数・合言葉の失敗回数
  key TEXT PRIMARY KEY,                       -- 例 'claude:2026-11-05'、'line:2026-11'、'login:<IPのハッシュ>:<10分の枠>'
  count INTEGER NOT NULL, expires_at TEXT NOT NULL
);
CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);  -- 'line_group_id' など
```

**R2**: 新しいバケット（バインディング `PHOTOS`）、キー `uploads/<id>.jpg`。非公開のまま、Worker の `GET /api/photo-files/:id` で配信。
**圃場一覧**: `src/data/fields.json`（架空。範囲は P15）。

## 6. API
| メソッド・パス | 認証 | 入力 | 成功 | 失敗 | 段 |
|---|---|---|---|---|---|
| `POST /api/session` | なし | `{passphrase}` | 204＋Cookie（HttpOnly, Secure, SameSite=Lax, 30日） | 401／429 | L0 |
| `POST /api/uploads` | member 以上 | multipart: `image`（JPEG、3MB 以下）＋`meta`（JSON） | 201 `{id}` | 401／409 `{id}`／413／415／422 | L0 |
| `GET /api/photos?fieldId=` | なし | — | 200 確定済み（撮影日の新しい順） | 400 | L0 |
| `GET /api/photos/recent?limit=50` | なし | — | 200 未確定を含む新着 | — | L0 |
| `GET /api/photo-files/:id` | なし | — | 200 画像 | 404 | L0 |
| `PATCH /api/photos/:id/assignment` | admin | `{fieldId}` | 200（confirmed）＋履歴1行 | 401／403／404／422 | L0 |
| `POST /api/fields/:id/status` | member 以上 | `{status, reasons[], note?, refPhotoIds[]}`（根拠はその圃場の確定済みの写真だけ） | 201 | 401／422 | L1 |
| `DELETE /api/status-events/:id` | member 以上 | — | 200 | 401／404 | L1 |
| `GET /api/fields/summary` | なし | — | 200 各圃場の有効な最新の判断・未確定の有無 | — | L1 |
| `POST /api/fields/:id/handover` | admin | — | 200 `HandoverNote`（作り直して保存） | 401／429／502 | L6 |
| `GET /api/fields/:id/handover` | なし | — | 200 `HandoverNote`／404 | — | L6 |
| `POST /api/line/webhook` | LINE の署名 | LINE のイベント | 200（`join` だけ処理してグループ ID を保存） | 401 | L8 |
| `POST /api/photos/:id/suggest` | admin | `{candidateFieldIds}`（人が選んだ2〜3圃場） | 200 `{suggestions:[{fieldId, reason}]}` | 401／422／429／502 | L5 |

- meta: `{contentHash(64桁16進), takenAt|null, takenAtSource, candidateFieldIds(最大3, 存在する圃場, 重複なし), chosenFieldId?}`。**距離・座標の項目があれば 422**（K6）。chosenFieldId があっても state は unconfirmed
- 合言葉: Secret `MEMBER_PASSPHRASE`・`ADMIN_PASSPHRASE`・`SESSION_SECRET`。照合は `crypto.subtle.timingSafeEqual`。Cookie は `base64url(JSON{device, role, exp}).base64url(HMAC-SHA256)`
- 合言葉の試行回数: 失敗は IP のハッシュ（`SESSION_SECRET` と日付で塩）ごとに 10分に5回まで。超えたら 429。生の IP は保存しない
- セッションは30日で失効。端末 ID はログインのたびに新しく作る
- Worker は CPU 10ms に収まる処理だけ（JPEG はセグメントの見出しをたどるだけ。デコード・縮小・全体のハッシュはしない）
- Claude を呼ぶ API は管理者だけ。1日の上限50回（環境全体）。`max_tokens` 1024、30秒で打ち切り、自動の再試行はしない。環境変数 `CLAUDE_ENABLED=false` で全部止められる。モデルは `claude-sonnet-5-5` から試す（`src/config.ts`）

## 7. 画面
| パス | 中身 | 段 |
|---|---|---|
| `/upload` | 合言葉 → 写真を選ぶ → 写真ごとにプレビュー・撮影日（不明なら「日付不明」）・候補（「A-03（約120m）」）・任意の番号選択 → 送る → 写真ごとの結果 | L0 |
| `/recent` | 新着。「未確定（推定 A-03）」「確定 A-03」。「更新」ボタンと最終取得時刻（自動反映はしない）。管理者の端末にだけ「確定・変更」 | L0 |
| `/` | 地図（番号ピン。判断の色、未確定の印）と新着への入口 | L1 |
| `/fields/[id]` | 確定済み写真を撮影日ごと（日付不明は別枠）、判断ボタン、判断の履歴（理由つき）、引き継ぎメモ（各文に根拠の印。根拠の無い文は灰色で「根拠なし」） | L1・L6 |

- 数字は控えめに。一覧では「番号・日付・写真・判断の色」だけ
- 文字は大きめ、ボタンは押しやすく（屋外・手袋を想定）
- 静的書き出しなので `/fields/[id]` は `generateStaticParams`（`src/data/fields.json` の全圃場）で作る

## 8. 技術とフォルダ
Next.js（App Router、`output: 'export'`）＋ Leaflet ＋ 国土地理院の地図タイル（出典表記が必須）／Cloudflare Workers（静的アセット＋API）、D1、R2／Vitest。層の決まりは AGENTS.md §4。

主な Service: `photo-meta.ts`（XMP/EXIF）、`candidates.ts`（ハバーサインで近い順）、`jpeg-segments.ts`（APP1〜15 検出、SOF から幅・高さ）、`upload-meta.ts`（meta の検証）、`session-token.ts`（HMAC は注入）、`photo-groups.ts`（撮影日ごと）、`status-reason.ts`（理由と根拠の検証）、`handover-document.ts`（記録を引用用の要素に並べる）、`handover-citations.ts`（返事の引用を記録に対応付ける）、`usage-limit.ts`（回数の上限）、`line-signature.ts`（署名の検証。HMAC は注入）。

## 9. 合格条件
| # | 条件 | 段 |
|---|---|---|
| 1 | 委員が「合言葉 → 選ぶ → 送る」で送れ、新着に「未確定（推定 ○○）」で出る（実機: Android・iPhone） | L0 |
| 2 | 公開側の画像に APP1〜15 が無い。撮影位置が D1・R2・通信のどこにも無い | L0 |
| 3 | 二端末: A が送った写真を、B が更新して見つけられる | L0 |
| 4 | 訂正: 番号を変えると新着の表示が変わり、履歴が残る。B でも確認できる | L0・L1 |
| 5 | 日付不明は「日付不明」のまま。二重送信は 409。番号を変えても二重にならない | L0 |
| 6 | 合言葉が無い端末は書き込めない（401）。委員の合言葉では確定・訂正できない（403） | L0 |
| 7 | 撮影位置あり48枚（非公開の実写真。手元だけ）で、正解表の番号が候補3つに入る割合 | L0 |
| 9 | 父の試用（架空データ）: 見つける比較（LINE のトーク vs このサイト、各3問）、送る・見つける・確定・判断の成否と助言回数。試用の後に提案し、引き出された声も記録 | L0〜L1 |
| 10 | リポジトリに実データ・秘密が無い（手元の検査＋CI＋提出前に履歴全体の検査） | L0 |
| 11 | 動画に、期間中に作ったもの・架空データだけが映る。冒頭1分で「A が送る → B の画面で見える」 | — |
| 12 | 判断ボタンで理由と根拠（写真）を残せ、取り消しも残る。根拠に他の圃場の記録は選べない | L1 |
| 13 | 引き継ぎメモの各文に引用で根拠が付き、タップで元の記録に戻れる。根拠の無い文は「根拠なし」と区別する | L6 |
| 14 | LINE の通知が失敗しても、写真の保存・判断の記録は成功する。月の送信数が上限の手前で止まる | L8 |
| 15 | 送信内容に撮影位置の座標も候補までの距離も無い | L0 |

### テスト（RED と GREEN は別コミット）
| 対象 | テスト |
|---|---|
| photo-meta | XMP の位置・日時／`GpsLongtitude`／EXIF の位置／0/0・0,0 は null／日時なしは null・none／日付は日本時間 |
| candidates | 近い順の番号だけ・最大 N／位置 null なら空／（画面用の距離は別の関数） |
| jpeg-segments | APP1 検出／APP2〜15 検出／メタデータ無しを通す／SOF の幅・高さ／JPEG 以外は例外 |
| upload-meta | 正常／存在しない番号・4件以上・重複・距離や座標の項目・不正なハッシュを拒否 |
| session-token | 正常／改ざん・期限切れ・役割の書き換えを拒否 |
| photo-groups | 撮影日ごと／日付不明は別／未確定はその圃場に出ない |
| status-reason | 選択肢に無いコード・200字を超えるメモ・他の圃場や存在しない記録への参照を拒否 |
| handover-document | 1記録＝1要素／日時の古い順／理由が空の判断は「理由の記録なし」／取り消した判断は「取り消し」 |
| handover-citations | 要素の番号を記録に対応付ける／複数の要素にまたがる引用／範囲外の番号と `document_index` が 0 以外の引用を捨てる／引用の無いブロックに「根拠なし」 |
| usage-limit | 上限ちょうどで止まる／日付・月が変われば戻る |
| line-signature | 正しい署名を通す／違う署名・本文の改ざんを拒否 |
| 保存の失敗 | D1 の UNIQUE 違反で R2 の画像を消して 409／その他の失敗で画像を消して 500 |

## 10. 公開リポジトリの安全
- 入れてはいけないもの: 実写真、実在の圃場の座標、委員会シート、番号対応表、合言葉、API キー、`.dev.vars`、`.env*`、個人名・住所、既存プロジェクトのコード
- `.gitignore`: `.dev.vars`、`.env*`、`/private/`、`*.local.*`
- GitHub の設定（外から見える設定は本人が承認してから）: Secret scanning と Push protection をオン／コミットのメールは noreply／main は Ruleset で守る（削除禁止・force push 禁止・PR 必須・CI の status check 必須）／マージ後のブランチを自動削除／Dependabot alerts だけオン（自動の更新 PR はオフ）／GitHub Pages・Wiki・Projects は使わない／Actions に Cloudflare の秘密を置かない（デプロイは本人の手元から。期間中は自動デプロイにしない）／ライセンスは MIT の予定（先輩に確認中。決まるまで LICENSE は置かない）
- `npm run check:safety`（手元と CI）: コミットされた全ファイル（`git ls-files`）を対象に、画像の APP1〜15、CSV、`.dev.vars` に似た名前、合言葉らしい文字列、架空データの座標の範囲を検査する（T00 は名前の検査のみ。中身は T17）
- 架空の圃場は12圃場程度、`A-01` 形式、座標は本人が決めた範囲に機械的に並べる（P15）。合成写真は `scripts/make-fixtures.ts` で `/private/fixtures/` に出す（コミットしない）

## 11. 環境
- ローカル（PC だけ、`wrangler dev` → `http://localhost:8787`）／**dev**（実機確認、HTTPS）／**demo**（審査員用）。dev と demo は D1・R2・Secret を別にする（`wrangler.jsonc` の `env`）
- Cloudflare の資源は既存のものと別名（`harvest-share-*`）。配線は L0 のサーバー側ができたときに本人が作る
- 手元の秘密は `.dev.vars`（`MEMBER_PASSPHRASE`・`ADMIN_PASSPHRASE`・`SESSION_SECRET`）。`SESSION_SECRET` は `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

## 12. 未確定（Unknown）
| # | 事項 | 誰が |
|---|---|---|
| P2 | iPhone／iPad の Safari が DJI の XMP の位置をブラウザに渡すか | 本人・父（実機） |
| P15 | 架空の圃場を置く範囲 | 本人 |
| P16 | 事前に書いた設計書（文章のみ）を参考にしてよいか | 運営（Discord に質問済み） |
| P17 | 「Claude の活用」の評価の中身 | キックオフ |
| P19 | Android の共有メニューから送った写真に XMP の位置が残るか（L4） | 実機 |
| P20・P23 | L8 で送るお知らせの種類、委員の人数 | 父 |
| P21 | 判断の理由の選択肢（何を見て「刈れる」とするか） | 父 |
| P5 | 父の試用の日程（11/5 ごろ、オンライン） | 父 |
| — | L6・L8 のサーバー側をどちらが持つか | L0 の後 |
| — | T11（SQL）のテストの仕方 | 先輩 |
