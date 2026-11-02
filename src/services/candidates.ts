/**
 * 候補の圃場を近い順に出す（L0 の流れ 3。docs/spec.md）。
 * 純粋関数。撮影位置はこの関数の外（サーバー）に出さない。戻り値は番号だけで距離は含めない（K6）。
 * 距離はハバーサイン。画面の「A-03（約120m）」用の距離は distanceMeters で別に出す。
 */
import { MAX_CANDIDATES } from "../config";
import type { Field } from "../types";

/** 緯度・経度（度） */
export interface LatLng {
  lat: number;
  lng: number;
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
  void position;
  void fields;
  void max;
  throw new Error("not implemented");
}

/** 2点間の距離（メートル、ハバーサイン）。画面に出すだけで、送らない・保存しない */
export function distanceMeters(from: LatLng, to: LatLng): number {
  void from;
  void to;
  throw new Error("not implemented");
}
