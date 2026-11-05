# 引き継ぎ: 画面の再設計と 1〜4 段目の実装（2026-11-04〜11-05 のセッション）

書いた: Claude（Fable 5.1 で始め、11-05 夕方に本人が Opus 5.5 へ切り替え）。次のセッションは、まずこの文書と `AGENTS.md`・`docs/spec.md` を読む。
手元のパス（作業フォルダ・画面集の元ファイル）はリポジトリに書かない決まりなので、本人の手元のメモ（共有メモのフォルダの `design-docs-handover.md`）にある。

## 1. いまの状態（11-05 夕方）
| 項目 | 状態 |
|---|---|
| 枝 `feature/l1-map-leaflet` | main から **27 コミット、未 push**。最新 `2626737`。`npm run check` 通過（テスト 78 ファイル 1792 件、lint 0 errors／2 warnings は前からのもの、build OK） |
| 枝 `docs/design-redesign-1104` | main から 2 コミット、未 push（再設計の文書・試作・11-04 の決定、「しないこと」N1〜N20） |
| PR | まだ作っていない。地図の枝は共有ファイル（`src/config.ts`・`src/types/`）を変えているので、**PR は先輩の確認待ち**（CLAUDE.md の例外） |
| デモ画面集 | claude.ai のアーティファクト「ear-to-ear デモ画面集」（https://claude.ai/artifact/Mv2uEWm87hqQp2svStJeDd）。地図・見比べる・刈る順番・LINE に 1 枚の実画面、精査で直した一覧、しないこと |
| 精査（別のセッション） | 「地図のデザイン精査」のセッション（Opus、書いた会話を見ていない）。3 回実施。結果は `docs/reviews/` の 3 本 |
| 先輩への依頼 | `docs/requests/2026-11-05-harvest-order-api.md`（刈る順番の共有の保存先）。**本人がまだ先輩に渡していない** |

## 2. 決まったこと（本人の決定・指示）
- **デザインの基準（11-05、Codex とのインタビューの合意）**: 「最初の視線を畑に向ける」。禁止事項を増やさず、見た瞬間に場所と関係が分かるかで判断する。文字だけで機能や状態を説明している所は線のアイコンと状態の印を添える（文字は消さない）。精査役への基準として本人の方針を写したものを渡した（`REVIEW-BRIEF.md`、精査用の複製フォルダだけに置いた）
- **地図（11-04 夜〜11-05）**: Leaflet＋地理院タイルの空中写真。架空の範囲は空知の農地（`FICTIONAL_AREA`、K10 は変えない）。区画は**その辺りの道と同じ向き（北から東へ 39°）の細長い帯**を地区ごとにまとめて置く（実在の境界はなぞらない）。札は箱なしの影つき文字、未確認は文字にしない。**黄緑は「収穫可能」だけ**（選択は白の太線＋濃い影に変えた。11-04 の「黄緑は収穫可能と選択」から変更）。目安は金の輪郭
- **見比べる（11-05 夕方、本人の指示で field-share の考え方を参考に）**: 2 つの比べ方。「同じ日の別の畑と」（日をまたいで比べない。相手の既定は目安。上下 2 つの窓）と「この畑の前の日と」（同じ畑の推移。2 枚を重ねる）。境目を指で動かす。相手は上の写真の帯を押して選ぶ。コードは持ち込まず自分で書いた（AGENTS §1-1）
- **昨年の同じ頃**: 昨年と今年を同じ形で並べるだけ。**日数の差は言わない**（「あと n 日」と読めるため）
- **刈る順番（3 段目）**: 下書きは記録だけから（**順位を付けるのは今年「収穫可能」と人が判断した畑だけ**。判断の無い畑は人が動かす）。AI（Claude）の下書きはまだ使わない。並べ替えは**音楽のプレイリストのように長押しでつかむ**（ほかの行がよけ、丸の番号も変わる）。▲▼ も残す。確定は委員長だけ、2 段で確かめる
- **LINE に 1 枚（4 段目）**: 確定した順の地図 1 枚の絵と「この順にするよ」の文を、**端末の共有（Web Share）で LINE へ**。トークン不要。ボットの自動送信（L8 のサーバー側）は先輩の担当で未
- **進め方**: 作る → 別のセッションの精査に送る → 指摘を本人が選んで直す。デモ画面は HTML／アーティファクトで見せる。Codex は「文字文字している」と出たときだけ（今回は呼んでいない）
- **名前**: 本番は「誰の圃場か」が分かる名前、デモは「北の3」の形（11-04 夜から変わらず）

## 3. 作ったもの（主なファイル）
| 段 | ファイル |
|---|---|
| 地図 `/` | `src/app/home-client.tsx`、`src/components/map/field-map.tsx`・`selection-dock.tsx`・`map-legend.tsx`、`src/components/app-nav.tsx`、`src/components/icons.tsx`、`src/hooks/use-field-selection.ts`・`use-latest-photo.ts`、`src/services/parcel-geometry.ts`、`src/data/parcels.json`・`fields.json`・`benchmarks.json` |
| 見比べる `/fields/[id]` | `src/app/fields/[id]/field-client.tsx`、`src/components/compare/*`（`split-viewer`・`compare-controls`・`photo-stream`・`status-panel`・`status-actions`・`status-history`・`last-season-note`・`field-switcher`）、`src/hooks/use-district-photos.ts`、`src/services/photo-compare.ts`・`last-season.ts`、`src/data/seasons.json`（架空の 2025） |
| 刈る順番 `/order` | `src/app/order/*`、`src/components/order/*`（`order-list`・`order-actions`・`next-to-shoot`・`line-share`）、`src/hooks/use-harvest-order.ts`・`use-order-share.ts`、`src/services/harvest-order.ts`・`order-message.ts`・`tile-math.ts`、`src/lib/order-image.ts`、`src/repositories/interfaces/i-harvest-order-repository.ts`、`src/repositories/implementations/local-harvest-order-repository.ts`、`src/repositories/create-harvest-order-repository.ts` |
| 共有ファイル（先輩の承認が要る） | `src/config.ts`（`FICTIONAL_AREA` を空知へ、`MAP_TILES`）、`src/types/index.ts`（`Parcel`・`Benchmark`） |
| 文書 | `docs/reviews/2026-11-05-map-design-review.md`・`compare-design-review.md`・`compare-design-review-2.md`、`docs/requests/2026-11-05-harvest-order-api.md`、この文書 |

テストは RED と GREEN を別のコミットにしている（各段のコミット一覧は `git log main..feature/l1-map-leaflet`）。

## 4. 残っていること（優先の高い順）
1. **push と PR**（2 つの枝）。PR の本文は AGENTS §3 の形（影響範囲／使ったライブラリ／同時に更新した文書／弱点候補 3〜5 個／検証ログ）。地図の枝は共有ファイルを変えるので先輩の確認待ち。push は一度権限で止められたことがあるので、本人に確かめてから
2. **先輩に依頼書を渡す**（本人）。返事の「決めてほしいこと」5 つ（委員の下書き保存、パス名、`SavedOrder` を共有の型にするか、検査の関数の担当、LINE との関係）
3. **`docs/spec.md` の直し**: §8・§10 が「地図タイルを出さない沖合の村」のまま（精査で指摘）。地図・見比べる・刈る順番・LINE に 1 枚の画面の節も足す。`docs/design/*`（文書の枝）も実装に合わせて書き直す
4. **実機の確認**: Worker 込み（`wrangler dev`）で地図・見比べる・刈る順番を通す。スマートフォンで長押しの並べ替え・Web Share で LINE に絵と文が届くか。結果は `docs/verification/` に
5. **精査で後回しにした提案**: 縮小時の地区名、「昨年の同じ頃」の作物名の強さ、判断の取り消しの二段確認
6. **範囲外の気づき（本人と先輩で決める）**: 理由に「農協の判定で中止」があるのに状態は収穫可能／収穫済の 2 つだけ。中止のときにどちらを選ぶか
7. **5 段目「来年の引き継ぎ」**（時間があれば）。11/7 の夕方以降は新しい段に手を付けない

## 5. 開発サーバーで画面を見るとき
- `next dev` には Worker の API が無い（判断・写真の読み込みが 404）。画面集の撮影では、ブラウザの中で `fetch` を差し替えて架空の値を入れた（差し込みの台本は本人の手元のメモのフォルダの `demo-mock.js`）。写真は canvas で描いた合成で、実写真ではない
- 開発サーバーの古い束で `/fields/[id]` が 500 になることがあった。立て直すと直る（本番の書き出しは正常）
- 刈る順番の保存は端末の中（localStorage の `ear-to-ear:order:<年>:<地区>`）。撮り直すときは消してから
