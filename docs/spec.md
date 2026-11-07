# 仕様（ear-to-ear）

期間前に文章で書いた設計を元に、期間中に書き直していく。11/3 の公式セッション「仕様の言語化: Known／Unknown」を受けて、Known と Unknown を分ける予定。決定の理由は `docs/decisions.md`、公開範囲は `docs/privacy.md`。

## 1. 一文で
**委員が合言葉を入れて写真を送るだけで、圃場番号の候補と撮影日が付いて全員に共有される。番号が決まらなくても「未確定（推定 ○○）」として先に共有し、管理者が確定・訂正する。判断（収穫可能／収穫済）とその理由（農協の判定を含む）も、同じ地図に残る。**

## 2. 成功の定義
「一人が取り込まなくても、委員が送った写真が別の委員の端末に届く（撮影位置が取れれば番号の候補付き、取れなければ『未確定』として届き、管理者が番号を付ける）。目的の畑・日付の写真を見つけられる。間違いは直せる。判断とその理由を後からたどれる。公開側に正確な撮影位置（座標、候補の畑までの距離）は残らない」

**共有の完了と番号の確定は別**。位置が取れない写真は、共有はすぐ・番号は管理者待ち。

### 作らないもの
子実水分の推定、農家名の表示（デモは「北の1」の形。本番で設定する。11-04 夜）、収穫順・台数の自動決定（刈る順番は記録からの**下書き**を人が並べ替えて委員長が確定する。下書きは順を決めない）、オルソ画像、個人アカウント・メール認証、既存サイトとの連携、スマホのネイティブアプリ。

## 3. 段（実施順。L0 が終わるまで他に手を付けない）
| 実施順 | 段 | 内容 | 目安 |
|---|---|---|---|
| 1 | **L0（必須）** | 合言葉（委員／管理者）、送る（ブラウザで前処理 → Worker が検査・保存）、新着一覧（未確定・確定、手動更新）、確定・訂正（履歴）、二重登録・日付不明、公開リポジトリの安全の仕組み、架空データ、開発用 Worker（HTTPS）での実機確認 | **11/4 夜まで** |
| 2 | **L1** | 地図（空中写真の上の区画の輪郭。判断の塗り・目安・未確定の写真がある圃場に印）、見比べる（2 つの比べ方・撮影日ごと・日付不明は別枠）、判断ボタン（収穫可能／収穫済）に理由と根拠を付ける: 理由の選択肢（複数）＋短いメモ＋根拠の写真。取り消し。理由の選択肢に「農協の判定で中止（水分超過）」「同（砕けなどの傷）」を必ず入れる | 11/5 |
| 3 | **L6（Claude の活用の中心）** | 圃場ごとの写真・判断から、次の年の委員が読める短い引き継ぎメモを作る。Claude API の引用（Citations）で各文に根拠の記録を付け、画面から元の記録に戻れる。記録に無い理由は「記録なし」 | 11/6 |
| 4 | **L8** | LINE でお知らせ（片方向、Messaging API）。ハッカソンでは架空のグループにだけ送る。判断を残した・取り消したときに 1 通（番号・状態・理由の言葉・日時・URL。メモ・写真・撮影位置は送らない）。**11-05 に先輩が前倒しで作ると決めた**（11-02 本人決定の「L6 の後で時間があれば」を受けて）。手順は `docs/dev/line.md` | 11/5〜6 |
| — | **刈る順番・LINE に 1 枚**（画面の再設計、11-04 夜 本人決定） | 刈る順番: 記録からの下書き（順位を付けるのは今年「収穫可能」と判断した畑だけ）→ 長押しで並べ替え → 委員長が 2 段で確定。地図に順位の丸、次に撮る畑。保存は端末の中（共有の保存先は先輩への依頼 `docs/requests/2026-11-05-harvest-order-api.md`）。LINE に 1 枚: 確定した順の地図 1 枚の絵を Web に置き（`POST /api/shares`）、文と共有の URL を端末の共有（Web Share）で送る。トークに地図のサムネイル（OGP）が出る（トークン不要。11-06 先輩決定、#159〜#163） | 11/5・11/6 |
| — | 来年の引き継ぎ（画面の再設計の 5 段目） | L6 のメモを翌年の同じ頃に地図の脇に出す | 時間があれば（11/7 夕方以降は手を付けない） |
| 5 | L5（実験） | 位置の無い写真について、人が選んだ候補2〜3圃場の写真と見比べて理由付きで並べ替える。確定は人。精度は主張しない | 時間があれば |
| 6 | L4 | Android の共有メニューから送る（Web Share Target） | 時間があれば |
| 7 | **L9** | LINE から写真を受け取る。**11-06 に本人が前倒しを決めた（#172）**。登録したグループに送られた画像だけを、サーバーが LINE から取りに行き、残すセグメントの種類を決めて（画像の表とスキャン）APP・COM などを読まずに捨ててから「未確定」（候補なし・撮影日なし）で新着に入れる。長辺 1600px・3MB を超えるもの、JPEG でないものは入れず、Web の「写真を送る」を案内する返事をする。受け取ったら 1 回だけ返事（reply、月の上限に数えない）。1 日 30 枚まで、1 回の webhook で 10 枚・20 秒まで。手順と台本は `docs/dev/line.md` の 7 | 11/6 |

やめた段: L2（水分の手入力）・L3（水分の紙の読み取り）— K16。「もう一つの新しいこと」は入れない（11-03 本人決定）。

## 4. 流れ（L0）
```text
[スマホのブラウザ /upload]（HTTPS 必須。Cookie の Secure と crypto.subtle は HTTPS でしか動かない）
  1. 写真を選ぶ（複数可）。合言葉は最初に聞かない（11-03 本人決定）
  2. （送って 401 が返ったときだけ）合言葉 → POST /api/session → Cookie（端末 ID・役割、30日）→ そのまま送り直す
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
- 公開側に残してよいメタデータは無い。縮小・再エンコードで全部消し、Worker でも APP1〜APP15 が無いことを検査する。**ただし Chrome の再エンコードは APP2（色の情報、ICC）を必ず付けるので、ブラウザで SOS より前の APP1〜15 を取り除き、残っていないことを確かめてから送る**（11-03、`src/services/prepared-photo.ts`）

## 5. データ契約
型は `src/types/index.ts`、定数は `src/config.ts`（どちらも共有ファイル）。圃場番号は架空データで `A-01` の形。

### D1（`migrations/`）
```sql
-- 0001_init.sql（L0〜L1）
CREATE TABLE uploaded_photos (
  id TEXT PRIMARY KEY NOT NULL,              -- SQLite の TEXT の主キーは NOT NULL を書かないと NULL が入る
  field_id TEXT,
  chosen_field_id TEXT,                       -- 委員が選んだ番号。確定ではない（確定は field_id）
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
CREATE TABLE usage_counters (                 -- Claude の呼び出し回数・LINE の送信数・合言葉の失敗回数
  key TEXT PRIMARY KEY NOT NULL,              -- 例 'claude:2026-11-05'、'line:2026-11'、'login:<IPのハッシュ>:<10分の枠>'
  count INTEGER NOT NULL, expires_at TEXT NOT NULL
);
-- 0002_handover.sql（L6）
CREATE TABLE handover_notes (
  field_id TEXT NOT NULL, season TEXT NOT NULL,
  body TEXT NOT NULL,                         -- JSON（HandoverNote の records と blocks）
  model TEXT NOT NULL, created_at TEXT NOT NULL,
  PRIMARY KEY (field_id, season)
);
-- 0003_settings.sql（L8、#139）
CREATE TABLE settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);  -- 'line_group_id' など
-- 0004_order_shares.sql（LINE に 1 枚、#159）。番号の並びだけ。座標・距離は持たない（K6）
CREATE TABLE order_shares (id TEXT PRIMARY KEY, season, district, ranked /* JSON */, benchmark_id /* NULL 可 */,
  confirmed_at, r2_key, bytes, width, height, actor_device, created_at, expires_at /* 60 日後、索引あり */);
```

**R2**: 新しいバケット（バインディング `PHOTOS`）、キー `uploads/<id>.jpg`。非公開のまま、Worker の `GET /api/photo-files/:id` で配信。
**圃場一覧**: `src/data/fields.json`（架空。12 圃場、北・中・南の 3 地区。範囲は §10）。区画の輪郭は `src/data/parcels.json`、目安の畑（年・地区ごと）は `src/data/benchmarks.json`、昨年の記録（架空の 2025）は `src/data/seasons.json`。どれも静的な JSON で D1 には入れていない。

## 6. API
| メソッド・パス | 認証 | 入力 | 成功 | 失敗 | 段 |
|---|---|---|---|---|---|
| `POST /api/session` | なし | `{passphrase}` | 204＋Cookie（HttpOnly, Secure, SameSite=Lax, 30日） | 401／429 | L0 |
| `GET /api/session` | member 以上 | — | 200 `{role}`（`member`／`admin`）。画面が「確定・変更」を出すかを決めるだけで、守るのは各 API の 401／403 | 401（入っていない） | L0 |
| `POST /api/uploads` | member 以上 | multipart: `image`（JPEG、3MB 以下）＋`meta`（JSON） | 201 `{id}` | 401／409 `{id}`／413／415／422 | L0 |
| `GET /api/photos?fieldId=` | なし | — | 200 確定済み（撮影日の新しい順） | 400 | L0 |
| `GET /api/photos/recent?limit=50` | なし | — | 200 未確定を含む新着 | — | L0 |
| `GET /api/photo-files/:id` | なし | — | 200 画像 | 404 | L0 |
| `PATCH /api/photos/:id/assignment` | admin | `{fieldId}`（圃場の一覧にある番号だけ） | 200 更新した写真（新着と同じ 11 項目）＋履歴1行。確定済みと同じ番号なら何も変えずに 200（履歴なし） | 400（形の違う本文）／401／403／404／413／415／422（一覧に無い番号・文字列でない番号） | L0 |
| `POST /api/fields/:id/status` | member 以上 | `{status, reasons[], note?, refPhotoIds[]}`（根拠はその圃場の確定済みの写真だけ） | 201 残した判断（`StatusEvent`） | 400（JSON でない）／401／413（2048 バイト超）／415／422 `{error, reason}`（一覧に無い圃場は `unknown_field`、中身は T12 の理由のコード）（11-04 先輩決定、T25） | L1 |
| `DELETE /api/status-events/:id` | member 以上 | — | 200 | 401／404 | L1 |
| `GET /api/fields/:id/status-events` | なし | — | 200 `StatusEvent[]`（その圃場の判断を取り消したものも含めて全件、`at` の新しい順・同じなら id の大きい順。件数の上限なし） | 404（一覧に無い圃場）（11-04 先輩決定、T26、#99） | L1 |
| `GET /api/fields/summary` | なし | — | 200 `{ fields: FieldSummary[] }`（全圃場を一覧の順）。各圃場の有効な最新の判断（取り消していないもので `at` が新しいもの、同じなら id の大きい方）と、未確定の写真の候補（最大3）か委員が選んだ番号に含まれるか（11-04 本人承認、#90） | — | L1 |
| `POST /api/fields/:id/handover` | admin | — | 200 `HandoverNote`（作り直して保存。同じ圃場・シーズンは上書き） | 401／403／404（一覧に無い圃場）／422 `no_records`（記録 0 件、Claude を呼ばない）／429（その日の上限、Retry-After は日本時間 0 時まで）／502 `{error, reason, upstreamStatus}`（reason は http・refusal・truncated・shape、保存しない。upstreamStatus は Claude が返した状態コードで、通信の失敗は 0。Worker のログにも理由と状態コードだけを 1 行残す。#192）／503 `claude_disabled`（`CLAUDE_ENABLED=false` かキーなし）（11-04 先輩決定、T31、#111） | L6 |
| `GET /api/fields/:id/handover` | なし | — | 200 `HandoverNote`（今のシーズン＝日本時間の年のメモ） | 404（メモが無い・一覧に無い圃場）（11-04 先輩決定、T29、#106） | L6 |
| `POST /api/line/webhook` | LINE の署名 | LINE のイベント | 200（`join` のグループ ID を保存。登録したグループの画像のメッセージは、応答の後に 1 つの `waitUntil` で 1 枚ずつ順に（10 枚・20 秒まで）LINE から取って `uploaded_photos` に「未確定」で入れ、reply で 1 回返す。L9、#172） | 401（署名）・413（64KB 超）・503 `line_disabled`（LINE の秘密が無い・`LINE_ENABLED` が false） | L8 |
| `POST /api/shares` | member | multipart `image`（JPEG 1.5MB 以下・長辺 2000px 以下・APP1〜15 無し）＋ `meta` `{season, district, confirmedAt, ranked[], benchmarkId}` | 201 `{id, url, imageUrl, expiresAt}`（期限は 60 日後。R2 `shares/<id>.jpg`・D1 `order_shares`） | 401／413／415／422 `reason`／429（端末ごとに 1 日 30 回） | LINE に 1 枚（#159） |
| `GET /api/shares/:id` | なし（LINE のサーバーが Cookie 無しで読む） | — | 200 `text/html`。OGP（og:title・og:description・og:image は要求の origin の絶対 URL）・`noindex`・`public, max-age=300` | 404（無い・期限切れ） | LINE に 1 枚（#160） |
| `GET /api/share-files/:id` | なし | — | 200 `image/jpeg`（`public, max-age=86400`） | 404（無い・期限切れ。R2 は読まない） | LINE に 1 枚（#160） |
| `POST /api/photos/:id/suggest` | admin | `{candidateFieldIds}`（人が選んだ2〜3圃場） | 200 `{suggestions:[{fieldId, reason}]}` | 401／422／429／502 | L5 |

- meta: `{contentHash(64桁16進), takenAt|null, takenAtSource, candidateFieldIds(最大3, 存在する圃場, 重複なし), chosenFieldId?}`。**距離・座標の項目があれば 422**（K6）。chosenFieldId があっても state は unconfirmed
- meta の細かい決まり（11-03 先輩決定、T04）: 文字列は 1024 文字まで。項目は5つの許可リストだけ。`contentHash` の大文字は小文字に直して受ける。`takenAt` は null か実在する `YYYY-MM-DD`。`takenAtSource` が `none` なら `takenAt` は null、`xmp`・`exif` なら日付。`chosenFieldId` は候補に無くても既知の番号なら受ける
- 合言葉: Secret `MEMBER_PASSPHRASE`・`ADMIN_PASSPHRASE`・`SESSION_SECRET`。照合は `crypto.subtle.timingSafeEqual`。Cookie は `base64url(JSON{device, role, exp}).base64url(HMAC-SHA256)`
- 合言葉の試行回数: 失敗は IP のハッシュ（`SESSION_SECRET` と日付で塩）ごとに 10分に5回まで。超えたら 429。生の IP は保存しない
- セッションは30日で失効。端末 ID はログインのたびに新しく作る
- Worker は CPU 10ms に収まる処理だけ（JPEG はセグメントの見出しをたどるだけ。デコード・縮小・全体のハッシュはしない）
- Claude を呼ぶ API は管理者だけ。1日の上限50回（環境全体）。`max_tokens` 1024、30秒で打ち切り、自動の再試行はしない。環境変数 `CLAUDE_ENABLED=false` で全部止められる。モデルは `claude-sonnet-5-5` から試す（`src/config.ts`）

## 7. 画面
| パス | 中身 | 段 |
|---|---|---|
| `/upload` | 写真を選ぶ → 写真ごとにプレビュー・撮影日（不明なら「日付不明」）・候補（「A-03（約120m）」）・任意の番号選択 → 送る → 写真ごとの結果。合言葉は送って 401 が返ったときだけ聞き、入れたら送り直す（11-03） | L0 |
| `/recent` | 新着。「未確定（推定 A-03）」「確定 A-03」。「更新」ボタンと最終取得時刻（自動反映はしない）。管理者の端末にだけ「確定・変更」（候補を「推定」として先に、残りを地区ごと。委員が選んだ番号は画面には出さない。値は `GET /api/photos/recent` の本文の `chosenFieldId` にはある。T21）。合言葉は「管理者として入る」を押したときと、401／403 のときだけ聞く | L0 |
| `/` | 地図。地理院タイルの空中写真の上に区画の輪郭（道と同じ向きの細長い帯）、札（番号と名前。箱なしの影つき文字）。判断の塗り（**黄緑は「収穫可能」だけ**、収穫済は濃い色、未確認は塗らない）、目安は金の輪郭、選んだ畑は白の太線と濃い影。押すと下の板に最新の写真と判断。凡例、写真を送るへの入口 | L1 |
| `/fields/[id]` | **見比べる**。上の段で 2 つの比べ方: 「同じ日に撮った別の畑と」（日をまたいで比べない。相手の既定は目安。上下 2 つの窓）と「この畑の前の日と」（2 枚を重ねて境目を指で動かす）。相手は上の写真の帯から選ぶ。下に判断を残す（理由・メモ・根拠の写真）、この畑の写真の流れ（撮影日ごと、日付不明は別枠）、昨年の同じ頃（昨年と今年を同じ形で並べる。**日数の差は言わない**）、判断の履歴（取り消し）、引き継ぎメモ（各文に根拠の印。根拠の無い文は灰色で「根拠なし」） | L1・L6 |
| `/order` | **刈る順番**。地区ごとに、記録からの下書き（破線の丸）→ 長押しでつかんで並べ替え（▲▼ も残す）→ 委員長が 2 段で確定（実線の丸）。判断の無い畑は順位を付けず人が動かす。次に撮る畑（今年の写真・判断が無い畑）。確定した順は **LINE に 1 枚**（「1. 送る準備」で地図 1 枚の絵を置いて共有の URL を作り、「2. LINE で送る」で「この順にするよ」の文と URL を Web Share で。トークに地図のサムネイルが出る。共有が無い端末は `line.me/R/share` に文と URL を渡す。URL を知る人は誰でも見られ、60 日で消える） | 再設計 |

- 下の帯で 地図／見比べる／刈る順番 を切り替える。選んだ畑は 3 つの画面で同じ（`/#A-03`・`/fields/A-03`・`/order#A-03`）
- 文字だけで機能や状態を説明している所は、線のアイコンと状態の印を添える（文字は消さない。11-05 本人とのインタビューの合意「最初の視線を畑に向ける」）。見た目の決まりは `docs/design/`

- 数字は控えめに。一覧では「番号・日付・写真・判断の色」だけ
- 文字は大きめ、ボタンは押しやすく（屋外・手袋を想定）
- 静的書き出しなので `/fields/[id]` は `generateStaticParams`（`src/data/fields.json` の全圃場）で作る

## 8. 技術とフォルダ
Next.js（App Router、`output: 'export'`）＋ Leaflet。地図の下地は**デモも本番も地理院タイルの空中写真**（`MAP_TILES`、出典表記「地理院タイル」が必須。タイルは実行時にブラウザが読み、リポジトリには入れない。11-04 夜の P15 の書き換え）。デモの区画は架空で、実在の境界はなぞらない。LINE に 1 枚の絵は canvas に地理院タイル（CORS 可）を描いて作る（`src/lib/order-image.ts`）／Cloudflare Workers（静的アセット＋API）、D1、R2／Vitest。層の決まりは AGENTS.md §4。

主な Service: `photo-meta.ts`（XMP/EXIF）、`candidates.ts`（ハバーサインで近い順）、`jpeg-segments.ts`（APP1〜15 検出、SOF から幅・高さ）、`upload-meta.ts`（meta の検証）、`session-token.ts`（HMAC は注入）、`resize-plan.ts`（縮小の大きさ）、`prepared-photo.ts`（APP1〜15 を取り除き、送る前に確かめる）、`upload-request.ts`（送る meta を5項目に絞る）、`photo-groups.ts`（撮影日ごと）、`status-reason.ts`（理由と根拠の検証）、`handover-document.ts`（記録を引用用の要素に並べる）、`handover-citations.ts`（返事の引用を記録に対応付ける）、`usage-limit.ts`（回数の上限）、`line-signature.ts`（署名の検証。HMAC は注入）。画面の再設計（11-04〜05）: `parcel-geometry.ts`（区画の形・札の位置・目安）、`photo-compare.ts`（2 つの比べ方の相手と日）、`last-season.ts`（昨年の同じ頃）、`harvest-order.ts`（記録からの下書き・並べ替え・次に撮る畑）、`order-message.ts`（LINE に送る文）、`tile-math.ts`（地図 1 枚の絵の座標）。

## 9. 合格条件
合格条件ごとに、どのテスト・Issue／PR・確かめ方で満たしたかを一本でたどれるようにする（Issue #11、11-03）。**状態**は「済」（満たした）／「一部」（何が残るかを書く）／「予定」（まだ確かめていない）。済・一部の実機の記録は `docs/verification/`。テストのファイルは `src/`・`worker/`・`scripts/` からの相対。

| # | 条件 | 段 | テスト | Issue・PR | 確かめ方 | 状態 |
|---|---|---|---|---|---|---|
| 1 | 委員が「合言葉 → 選ぶ → 送る」で送れ、新着に「未確定（推定 ○○）」で出る（実機: Android・iPhone） | L0 | `lib/upload-steps`、`services/photo-labels`・`recent-view`、`repositories/…/http-photo-repository`、`worker/uploads`・`session` | PR #44・#51・#55・#58・#61・#62・#64・#70・#72、Issue #67（T21） | 自動＋実機（dev） | **一部**: 選ぶ・候補と撮影日の表示は Android と iPhone の実機で済、送る（同じ写真は 409）も dev の実機で済（`verification/2026-11-03-dev-mobile.md`）。新着に未確定で出るのは dev の Android と PC で済（`verification/2026-11-04-dev-two-devices.md`）。iPhone の新着・確定は、シミュレータの Safari（iOS 26.3.1・18.5）で送る・新着・確定・番号の付け替えまで動いた（`verification/2026-11-06-ios-simulator-safari.md`）。実機は予定 |
| 2 | 公開側の画像に APP1〜15 が無い。撮影位置が D1・R2・通信のどこにも無い | L0 | `services/jpeg-segments`・`prepared-photo`・`upload-meta`・`upload-request`、`lib/upload-steps`、`worker/uploads`、`scripts/safety-rules` | PR #6・#41・#48・#51・#64 | 自動＋画面（送る中身を内蔵ブラウザで確認、PR #57） | **一部**: 自動と画面は済。dev の R2・D1 の中身の確認は予定 |
| 3 | 二端末: A が送った写真を、B が更新して見つけられる | L0 | — | Issue #67（T21） | 実機（二端末） | **済**: dev の Android と PC で、A が送る → B の新着に未確定で出る → 確定 → もう一方で読み直して確定が見える（`verification/2026-11-04-dev-two-devices.md`）。iPhone は予定 |
| 4 | 訂正: 番号を変えると新着の表示が変わり、履歴が残る。B でも確認できる | L0・L1 | `services/assignment`・`assignment-request`、`repositories/…/http-photo-repository`、`worker/assignment` | PR #55（画面）、Issue #78（サーバー） | 自動＋手元の `wrangler dev`＋実機（二端末） | **一部**: 画面・サーバー・履歴は自動と手元の `wrangler dev` で済（送る → 新着 → 確定 → 読み直しても確定、履歴 2 行）。dev の二端末（Android と PC）で確定 → もう一方で読み直しまで済（`verification/2026-11-04-dev-two-devices.md`）。番号の付け替えの実機は予定 |
| 5 | 日付不明は「日付不明」のまま。二重送信は 409。番号を変えても二重にならない | L0 | `services/photo-meta`・`photo-labels`、`worker/uploads` | PR #50・#64・#72 | 自動＋実機（dev、合成写真 05・08） | **一部**: 日付不明と 409 は済。番号を変えても写真は増えず、同じ番号なら履歴も増えない（Issue #78 のテスト）。dev の実機は予定 |
| 6 | 合言葉が無い端末は書き込めない（401）。委員の合言葉では確定・訂正できない（403） | L0 | `worker/auth`・`routes`・`session`、`services/session-token` | PR #24・#47・#58 | 自動＋実機（dev） | **一部**: 401・403 の判定は自動で済。管理者の合言葉で入れる・合言葉が要るときに入力が出るのは実機で済。委員の Cookie での確定・訂正が 403 なのは手元の `wrangler dev` で済、dev の実機は予定 |
| 7 | 撮影位置あり48枚（非公開の実写真。手元だけ）で、正解表の番号が候補3つに入る割合 | L0 | `services/candidates`（計算） | PR #38 | 手元の実写真（リポジトリに入れない） | 予定 |
| 9 | 父の試用（架空データ）: 見つける比較（LINE のトーク vs このサイト、各3問）、送る・見つける・確定・判断の成否と助言回数。試用の後に提案し、引き出された声も記録 | L0〜L1 | — | — | 試用（P5） | 予定 |
| 10 | リポジトリに実データ・秘密が無い（手元の検査＋CI＋提出前に履歴全体の検査） | L0 | `scripts/safety-rules`（`npm run check:safety`、CI） | PR #39・#42 | 自動（毎回）＋提出前の履歴全体（`node scripts/check-history.mjs`、`docs/dev/final-review.md`） | **一部**: 手元と CI は済。履歴全体は 11-06 に 211 コミット・895 版で OK（検査が見つけられることは使い捨てのリポジトリで確かめた）。提出の直前の main でもう一度 |
| 11 | 動画に、期間中に作ったもの・架空データだけが映る。冒頭1分で「A が送る → B の画面で見える」 | — | — | — | 録画を人が見る | 予定 |
| 12 | 判断ボタンで理由と根拠（写真）を残せ、取り消しも残る。根拠に他の圃場の記録は選べない | L1 | `services/status-reason`・`status-request`・`status-events`、`worker/field-status`・`status-events`・`status-history` | PR #93・#96・#100・#101・#102・#115・#120 | 自動＋実機 | **一部**: 自動は済（他の圃場の写真は 422）。dev の実機は予定 |
| 13 | 引き継ぎメモの各文に引用で根拠が付き、タップで元の記録に戻れる。根拠の無い文は「根拠なし」と区別する | L6 | `services/handover-document`・`handover-citations`・`handover-request`・`handover-view`、`worker/handover`・`handover-post` | PR #108〜#110・#112・#113・#116・#119・#120 | 自動＋実機（`docs/dev/l6-live.md`） | **一部**: 自動は済（引用は渡した記録の範囲だけ。範囲の外の引用は捨て、返事の形が違えば 502）。指示文は試作台の疑似で確かめた（#119）。本物の API と実機は予定（dev のデプロイと `CLAUDE_API_KEY` の後） |
| 14 | LINE の通知が失敗しても、写真の保存・判断の記録は成功する。月の送信数が上限の手前で止まる | L8 | `services/usage-limit`（回数の部分）・`line-signature`・`line-webhook`・`line-notice`、`worker/line-webhook`・`line-notify` | PR #143〜#147 ほか | 自動＋実機（`docs/dev/line.md` の台本） | **一部**: 自動は作成中。LINE 側の設定と実機は予定 |
| 15 | 送信内容に撮影位置の座標も候補までの距離も無い | L0 | `services/upload-meta`（受け側で拒否）・`upload-request`、`lib/upload-steps`（送る meta に座標なし） | PR #41・#51・#57 | 自動＋画面（送る中身を内蔵ブラウザで確認） | **済** |
| 16 | 来年の引き継ぎ: 昨年（2025）の引き継ぎメモを、昨年の判断の日の前後（`LAST_SEASON_HANDOVER_DAYS` 日、端を含む）だけ、地図の板（「昨年の引き継ぎ（2025年）あり ›」の 1 行の入口）と見比べる（「昨年の同じ頃」の段に畳んだ全文と、年つきの出所）に出す。範囲の外・記録の無い畑・小麦でない年は出さない。日数の差・「あと n 日」は言わない。昨年のメモは**手で書いた架空の例**（`src/data/handover-2025.json`）で、Claude が作ったメモと言わない。出所は今年の記録へのリンクにも押せる札にもしない | 再設計（5 段目） | `services/last-season-handover`、`data/handover-2025` | （この PR） | 自動＋画面（`?today=2026-07-20` で今日を差し替えて見る） | 予定 |

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
- GitHub の設定（外から見える設定は本人が承認してから）: Secret scanning と Push protection をオン／コミットのメールは noreply／main は Ruleset で守る（削除禁止・force push 禁止・PR 必須・CI の status check 必須）／マージ後のブランチを自動削除／Dependabot alerts だけオン（自動の更新 PR はオフ）／GitHub Pages・Wiki・Projects は使わない／デプロイは GitHub Actions（11-04 本人決定。main へのマージで dev、demo は人が画面で押して承認。Cloudflare のトークンは GitHub の Environment の秘密にだけ置き、`pull_request` では動かさない。`docs/dev/deploy-actions.md`）／ライセンスは MIT の予定（先輩に確認中。決まるまで LICENSE は置かない）
- `npm run check:safety`（手元と CI）: コミットされた全ファイル（`git ls-files`）を対象に、画像の APP1〜15、CSV、`.dev.vars` に似た名前、合言葉らしい文字列、架空データの座標の範囲を検査する。T17（11-03）で中身まで: 判定は `scripts/safety-rules.ts`。**JPEG は `public/demo/` の下だけ許し、APP1〜15 が無いことを T03 の `inspectJpeg` で確かめる**。**座標は圃場の一覧 `src/data/fields.json` だけ**を `FICTIONAL_AREA`（`src/config.ts`）と比べる（端を含む）。秘密らしい文字列は値を表示せず、ファイル・行・種類だけ出す
- 架空の圃場は 12 圃場（A-01〜A-12、北・中・南の 3 地区）。範囲 `FICTIONAL_AREA` は**空知の公開の農地**（北緯 43.235〜43.250、東経 141.740〜141.760。11-04 夜の P15 の書き換え。11-02 の「沖合の四角」から移した）。区画（`src/data/parcels.json`）は、空中写真に写る畑の境目に沿ってなぞった形（11-07 本人決定。範囲の中の、実家と無関係の畑だけ。持ち主の情報と実際の判断は入れず、番号・名前・判断は架空。11-06 までは道と同じ向きの細長い帯を機械的に置いていた）。実家の畑の座標は入れない（K10 は変えない）。安全検査が範囲と比べるのは `fields.json` の座標で、`parcels.json` の頂点が範囲の中にあることはテスト（`src/data/parcels.test.ts`）で確かめる。合成写真は `node scripts/make-fixtures.mjs` で `/private/fixtures/` に出す（コミットしない。T10、11-03）。8種類（XMP 位置あり・EXIF 位置あり・0/0・位置なし・日時なし・APP2 付き・壊れた画像・重複）と、期待の一覧 `README.md`。JPEG は依存なしの書き出し（`scripts/fixtures/jpeg-encoder.ts`）で作る

## 11. 環境
- ローカル（PC だけ、`wrangler dev` → `http://localhost:8787`）／**dev**（実機確認、HTTPS）／**demo**（審査員用）。dev と demo は D1・R2・Secret を別にする（`wrangler.jsonc` の `env`）
- Cloudflare の資源は既存のものと別名（`harvest-share-*`）。配線は L0 のサーバー側ができたときに本人が作る
- 手元の秘密は `.dev.vars`（`MEMBER_PASSPHRASE`・`ADMIN_PASSPHRASE`・`SESSION_SECRET`）。`SESSION_SECRET` は `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

## 12. 分かっていること（Known）と未確定（Unknown）
分ける基準（Issue #11、11-03）: **Known** は実機・記録・テストで確かめた事実で、出どころと日付を書く。**Unknown** は確かめていないことで、誰が決めるかと、決まるまでの**仮置き**（それで作り進める前提）を書く。仮説の期限と崩れたときの代替は `docs/hypotheses.md`。決めたことは `docs/decisions.md`。

### 12-1. Known（確かめた事実）
| 事実 | 出どころ・日付 |
|---|---|
| DJI の写真は位置と日時を XMP に持つ（EXIF の GPS 欄は無い。綴り違い `GpsLongtitude` の機種がある） | 事前の調べ、T01 のテスト（`services/photo-meta`）。§4 |
| Android の Chrome は、スマホのカメラの EXIF の位置を消して渡す。DJI の XMP の位置は残る | 10-24 本人の実機（XMP）、11-03 dev の実機で合成写真 01（XMP）は候補あり・02（EXIF）は候補なし（`verification/2026-11-03-dev-mobile.md`） |
| iPhone の Safari でも、DJI の XMP の位置で候補が出る（P2） | 11-03 dev の実機（本人「Safari でいけた」）。選び方（ファイル／写真ライブラリ・位置情報のオプション）ごとの細部は未記録 |
| Chrome の canvas の再エンコードは APP2（ICC）を必ず付ける | 11-03 内蔵ブラウザ（PR #48）。送る前に APP1〜15 を取り除いて確かめる |
| 架空の圃場は空知の農地（北緯 43.235〜43.250・東経 141.740〜141.760）に 12 圃場（P15） | 11-02 決定・11-04 夜の書き換え（`decisions.md`）、安全検査 `scripts/safety-rules` |
| 地理院タイルの空中写真は CORS 可で、canvas に描いて JPEG にできる（LINE に 1 枚の絵） | 11-05 開発サーバーの内蔵ブラウザ（4 段目） |
| SQL（T11）は `node:sqlite` に流して確かめ、手元の D1 でも流す | 11-02（`worker/migrations.test.ts`） |
| 審査は「影響 30・デモ 25・Claude の活用 25・深さと実行力 20」（P17） | 11-02 審査基準の画像 |
| 判断の理由（何を見て「刈れる」とするか）は「穂の色」と「畑に占める黄色い穂の割合」（黄色が多ければよい）（P21） | 11-03 父の答え（本人経由）。選択肢には農協の判定で中止の2つ（水分超過・砕けなどの傷）も必ず入れる（§3 の L1） |
| dev（HTTPS）に出せて、スマホで送るまで動く | 11-03 本人のデプロイと実機（`verification/2026-11-03-dev-mobile.md`） |

### 12-2. Unknown（未確定）
| # | 事項 | 誰が決めるか | 仮置き（決まるまでの前提。案を含む） | 状態 |
|---|---|---|---|---|
| P16 | 事前に書いた設計書（文章のみ）を参考にしてよいか | 運営（Discord に質問済み） | 参考にしない前提で書く（spec は期間中に書き直した正本） | 未回答 |
| P19 | Android の共有メニューから送った写真に XMP の位置が残るか（L4） | 本人（実機） | L4 は作らない（時間があれば） | 未確認 |
| P20・P23 | L8 で送るお知らせの種類、委員の人数 | 父 | L8 は L6 の後で時間があれば。作るなら架空のグループだけ | 未回答 |
| P5 | 父の試用の日程（11/5 ごろ、オンライン） | 父 | 11/5 に試用する前提。できなければ合格条件 9 を「本人による再現」に下げる | 未確定 |
| — | `POST /api/session` の回数の制限と CSRF・Cookie 名（先輩の決定、#54） | 本人（承認） | 先輩の決定どおりに動いている（`decisions.md` 11-03） | 本人の承認待ち |
| — | demo の合言葉を審査員に渡すか | 本人・先輩 | なし（まだ考えていない） | 未決定 |
| — | L8 のサーバー側をどちらが持つか | 本人・先輩 | **先輩**（11-05 先輩が作ると決めた。#131） | 決定（11-05） |
| — | 理由に「農協の判定で中止」があるのに、状態は収穫可能／収穫済の 2 つだけ。中止のときにどちらを選ぶか | 本人・先輩 | なし（いまは人が選ぶ） | 未決定 |
| — | 刈る順番の共有の保存先（GET/PUT の API と D1）と、決めてほしい 5 つ | 先輩（依頼書 `docs/requests/2026-11-05-harvest-order-api.md`） | 端末の中に保存（ほかの委員には見えない） | 依頼中 |
| — | スマートフォンでの長押しの並べ替えと、Web Share で LINE に文と URL が届きサムネイルが出るか（#163） | 本人・先輩（実機） | 出る前提で作った。縦長の絵が切られるなら横長を別に描く | 未確認 |
| — | 合格条件 7 の48枚の正解表で、候補3つに入る割合 | 本人（手元の実写真） | 主張しない（測るまで数字を書かない） | 未測定 |

P5・P19・P20 の仮置きは `docs/hypotheses.md` の「既決の代替」の**案**（11-02 提案。期限と代替は本人の決定待ち）。

解決したもの: P2（→ 12-1）、P21（→ 12-1）、P15（→ 12-1）、P17（→ 12-1）、T11 の SQL のテストの仕方（→ 12-1）、「もう一つの新しいこと」（入れない。11-03 本人決定）
