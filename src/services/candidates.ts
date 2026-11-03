/**
 * 候補の圃場を近い順に出す（L0 の流れ 3。docs/spec.md）。
 * 純粋関数。撮影位置はこの関数の外（サーバー）に出さない。戻り値は番号だけで距離は含めない（K6）。
 * 距離はハバーサイン。画面の「A-03（約120m）」用の距離は distanceMeters で別に出す。
 */
import { MAX_CANDIDATES } from "@/config";
import type { Field } from "@/types";

/** 緯度・経度（度） */
export interface LatLng {
  lat: number;
  lng: number;
}

/** 地球の半径（メートル） */
const EARTH_RADIUS_METERS = 6_371_000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * 撮影位置から近い順に、圃場の番号だけを最大 max 件返す。
 * 位置が null なら空配列。距離が同じなら番号の昇順。引数の配列は変えない。
 */
export function candidateFieldIds(
  position: LatLng | null,
  fields: readonly Field[],
  max: number = MAX_CANDIDATES,
): string[] {
  if (position === null) return [];
  return fields
    .map((f) => ({ id: f.id, distance: distanceMeters(position, f) }))
    .sort((a, b) => {
      if (a.distance !== b.distance) return a.distance - b.distance;
      if (a.id < b.id) return -1;
      if (a.id > b.id) return 1;
      return 0;
    })
    .slice(0, Math.max(0, max))
    .map((c) => c.id);
}

/** 2点間の距離（メートル、ハバーサイン）。画面に出すだけで、送らない・保存しない */
export function distanceMeters(from: LatLng, to: LatLng): number {
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}
