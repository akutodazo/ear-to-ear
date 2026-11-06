/**
 * LINE に 1 枚の絵の配置（純粋関数）。LINE のトークのサムネイルは絵を 3:4 ほどに切る（11-06 の iPhone の LINE で見た、推定）。
 * 1080×1200 だと左右が 90px ずつ切れるので、見出し・注記・出典（地理院タイルは表記が必須）・区画をその内側に置く
 */

export const ORDER_IMAGE_SIZE = { width: 1080, band: 120, mapHeight: 1080, height: 1200 } as const;

/** サムネイルの縦横比（幅 / 高さ） */
export const THUMBNAIL_CROP_RATIO = 3 / 4;

/** 縦横比 ratio に中央で切ると、左右それぞれ切られる幅（px） */
export function safeInsetX(width: number, height: number, ratio: number): number {
  return Math.max(0, (width - height * ratio) / 2);
}

export interface OrderImageLayout {
  /** 見出しの左端 */
  titleX: number;
  /** 注記の箱の左端 */
  noteBoxX: number;
  /** 出典の箱の右端 */
  creditBoxRight: number;
  /** 区画を地図に収めるときの余白 */
  mapPadding: number;
}

const GAP = 24;

export function orderImageLayout(): OrderImageLayout {
  const { width, height } = ORDER_IMAGE_SIZE;
  const inset = safeInsetX(width, height, THUMBNAIL_CROP_RATIO);
  return {
    titleX: inset + GAP,
    noteBoxX: inset + GAP,
    creditBoxRight: width - inset - GAP,
    // 名前の文字（中心から左右に 150px ほど）がはみ出さないよう広めに
    mapPadding: inset + 70,
  };
}
