/**
 * 地図 1 枚の絵の座標計算（11-05、4 段目「LINE に 1 枚」）。純粋関数。
 * 地理院タイルと同じ Web メルカトル・256px のタイル。絵の左上を「世界の画素」で持ち、緯度経度を絵の中の位置に直す
 */
import type { Bounds } from "./parcel-geometry";

const TILE = 256;

/** 絵の倍率と、絵の左上の世界の画素 */
export interface View {
  zoom: number;
  originX: number;
  originY: number;
}

export interface TileDraw {
  z: number;
  x: number;
  y: number;
  /** 絵の中に描く左上（px） */
  dx: number;
  dy: number;
}

/** 緯度経度 → その倍率の世界の画素 */
export function worldPixel(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const size = TILE * 2 ** zoom;
  const phi = (lat * Math.PI) / 180;
  const x = ((lng + 180) / 360) * size;
  const y = ((1 - Math.log(Math.tan(phi) + 1 / Math.cos(phi)) / Math.PI) / 2) * size;
  return { x, y };
}

/** 範囲が余白込みで width×height に入る、いちばん大きな整数の倍率（maxZoom まで）。範囲の真ん中を絵の真ん中に */
export function fitView(bounds: Bounds, width: number, height: number, padding: number, maxZoom: number): View {
  let zoom = 0;
  for (let z = Math.floor(maxZoom); z >= 0; z--) {
    const nw = worldPixel(bounds.latMax, bounds.lngMin, z);
    const se = worldPixel(bounds.latMin, bounds.lngMax, z);
    if (se.x - nw.x <= width - 2 * padding && se.y - nw.y <= height - 2 * padding) {
      zoom = z;
      break;
    }
  }
  const c = worldPixel((bounds.latMin + bounds.latMax) / 2, (bounds.lngMin + bounds.lngMax) / 2, zoom);
  return { zoom, originX: c.x - width / 2, originY: c.y - height / 2 };
}

/** 緯度経度 → 絵の中の位置（px） */
export function projectToView(view: View, lat: number, lng: number): { x: number; y: number } {
  const p = worldPixel(lat, lng, view.zoom);
  return { x: p.x - view.originX, y: p.y - view.originY };
}

/** 絵を覆うタイルと、それぞれを描く位置 */
export function tilesForView(view: View, width: number, height: number): TileDraw[] {
  const x0 = Math.floor(view.originX / TILE);
  const x1 = Math.floor((view.originX + width - 1) / TILE);
  const y0 = Math.floor(view.originY / TILE);
  const y1 = Math.floor((view.originY + height - 1) / TILE);
  const tiles: TileDraw[] = [];
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      tiles.push({ z: view.zoom, x, y, dx: x * TILE - view.originX, dy: y * TILE - view.originY });
    }
  }
  return tiles;
}
