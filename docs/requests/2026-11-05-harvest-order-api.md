# 依頼: 刈る順番の共有の保存先（API と D1）

- 依頼する人: 本人（ブラウザ側）。書いた: Claude（11-05）
- 頼む人: 先輩（サーバー側。`worker/`・`migrations/` の担当、AGENTS.md §2）
- 期限の希望: 11/7 の昼まで（11/7 の夕方以降は新しい段に手を付けない決まりのため）
- 状態: **依頼中**（先輩の返事待ち。下の「決めてほしいこと」に答えをもらってから作る）

## 1. なぜ要るか
3 段目「刈る順番」（`/order`）の画面ができた（枝 `feature/l1-map-leaflet`）。記録から並べた下書きを人が並べ替え、委員長が確定する。いまは**保存先が端末の中だけ**なので、委員長が確定しても、ほかの委員の端末には届かない（画面にもそう書いている）。

11-04 夜の本人決定の流れ「父が下書きを直す → これでいいか → OK → LINE に『○○の順にするよ』」には、**確定した順を全員が同じものとして見られる**ことが要る。4 段目「LINE に 1 枚」も、確定した順をサーバーが知っていることが前提になる。

画面の側は保存先の約束（`src/repositories/interfaces/i-harvest-order-repository.ts`）だけを知っているので、API ができれば HTTP の実体を足して差し替えるだけで済む（画面は変えない）。

## 2. 頼みたいもの

### 2-1. D1 の表（`migrations/0002_harvest_orders.sql`）
判断（`field_status_events`）と同じく、**上書きせず 1 行ずつ足す**形を提案する。経緯が残り、来年の引き継ぎ（5 段目）でも「いつ誰の端末が確定したか」をたどれる。

```sql
CREATE TABLE harvest_order_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  season TEXT NOT NULL,                       -- '2026'
  district TEXT NOT NULL,                     -- '北地区'（src/data/fields.json の district）
  ranked TEXT NOT NULL,                       -- JSON 配列（圃場番号。上から刈る）
  unranked TEXT NOT NULL,                     -- JSON 配列（順位を付けていない圃場）
  state TEXT NOT NULL CHECK (state IN ('draft','confirmed')),
  actor_device TEXT NOT NULL,                 -- セッションの端末 ID（個人名は持たない）
  at TEXT NOT NULL                            -- サーバー時刻 ISO 8601
);
CREATE INDEX idx_order_events ON harvest_order_events(season, district, id);
```

- 収穫済の畑は持たない（判断の記録から画面が分ける）
- 座標・距離は一切持たない（K6）。持つのは圃場番号だけ

### 2-2. API（`docs/spec.md` §6 に足す）
| メソッド・パス | 認証 | 入力 | 成功 | 失敗 |
|---|---|---|---|---|
| `GET /api/orders?season=2026&district=北地区` | なし（`GET /api/fields/summary` と同じ） | — | 200 `{ latest: SavedOrder \| null, confirmed: SavedOrder \| null }` | 400（season・district の形が違う） |
| `PUT /api/orders` | 下書きは member 以上、確定は admin | `{ season, district, ranked[], unranked[], state }` | 201 足した 1 行（`SavedOrder`） | 400（JSON でない）／401／403（member が `confirmed`）／413（2048 バイト超）／415／422 `{error, reason}` |

`SavedOrder` の形（画面の約束と同じ。共有の型にするなら `src/types/` に移す。§4）:

```ts
interface SavedOrder {
  district: string;
  season: string;
  ranked: string[];
  unranked: string[];
  state: "draft" | "confirmed";
  savedAt: string;            // その行の at
  confirmedAt: string | null; // state が confirmed ならその行の at、draft なら null
}
```

- `latest`: その年・地区のいちばん新しい行（下書きでも確定でも）
- `confirmed`: その年・地区のいちばん新しい `confirmed` の行。確定の後に誰かが下書きを保存しても、確定した順が消えないように分けて返す（画面は「確定した順と違います」「確定した順に戻す」を出す）

### 2-3. 入力の検査（422 の理由のコード）
| 条件 | reason |
|---|---|
| 許可した 5 項目以外がある | `unknown_key` |
| `season` が 4 桁の数字でない | `bad_season` |
| `district` が圃場の一覧に無い | `unknown_district` |
| `ranked`・`unranked` が文字列の配列でない | `bad_list` |
| 一覧に無い番号、またはその地区でない番号 | `unknown_field` |
| 同じ番号が 2 回（片方の中でも、両方にまたがっても） | `duplicate_field` |
| `state` が `draft`・`confirmed` 以外 | `bad_state` |

検査は純粋関数（例 `src/services/harvest-order-request.ts`）にして、画面も同じ決まりで送る前に確かめる（判断の `parseStatusInput` と同じやり方）。この関数の置き場所は「後で決める」枠（AGENTS.md §2）なので、どちらが書くかも決めてほしい（§4）。

## 3. 合格条件（テストに書いてほしいこと）
1. 保存した行を `GET` で読める。行が無ければ `latest`・`confirmed` とも `null`
2. 確定の後に下書きを保存すると、`latest` は下書き、`confirmed` は前の確定のまま
3. member の合言葉で `state: confirmed` は 403。admin なら 201
4. 入っていない端末の `PUT` は 401
5. §2-3 の 7 つの理由がそれぞれ 422 で返る
6. 本文が 2048 バイトを超えたら 413、JSON でなければ 400、`Content-Type` が違えば 415
7. 行は上書きされず、`PUT` のたびに 1 行増える
8. 返す本文に座標・距離・端末 ID が無い（端末 ID は表にだけ持つ）

## 4. 決めてほしいこと（先輩と本人）
1. **下書きの保存を委員（member）にも許すか**。提案は「許す」（11-04 夜の流れでは父が直すが、委員が案を残せると話し合いが早い）。許さないなら下書きの保存も admin だけにし、画面は「保存」を委員に出さない
2. **パスの名前**。提案は `/api/orders`（地区名を URL の途中に入れると日本語の扱いが面倒なので、クエリにする）
3. **`SavedOrder` を共有の型（`src/types/`）に移すか**。移すなら共有ファイルの変更なので両方の承認が要る（AGENTS.md §2）。移さないなら Worker 側に同じ形を書く
4. **検査の関数（§2-3）をどちらが書くか**
5. 確定したときに LINE に送るのは 4 段目（L8）の話で、この依頼には入れない。確定の行が足されたことを L8 が知る方法（同じハンドラの中で送るか、別にするか）は L8 のときに決める

## 5. 本人（ブラウザ側）がすること
- `src/repositories/implementations/http-harvest-order-repository.ts` を足し、`create-harvest-order-repository.ts` を HTTP に差し替える（端末の中の実体はテスト用に残す）
- 約束を `latest`・`confirmed` の 2 つを返す形に直す（いまは 1 つ）
- 画面の「いまの保存先はこの端末だけです」を消す
- 手元の `wrangler dev` で、二台（委員と委員長）で確定が届くことを確かめる（`docs/verification/` に残す）

## 6. 確かめた前提
- 圃場の一覧・地区は `src/data/fields.json`（架空。K10）
- 判断の記録は `field_status_events`（取り消しは `revoked_at`）。刈る順番の行は判断を書き換えない
- 委員の手間は増えない（K1）。委員は見るだけでよく、保存・確定は父（委員長）が行う
