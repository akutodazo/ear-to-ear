/**
 * 圃場の輪郭と地図の札（L1 の地図、11-04 夜の本人決定）。純粋関数。Leaflet には依存しない。
 * 輪郭の中の塗りは人の判断（収穫可能／収穫済）、未確認は塗らない（docs/design/design-system.md §3-3）。
 * ここは記録を形と言葉にするだけで、収穫できるかを推測しない。
 */
import type { Benchmark, Field, FieldSummary } from "@/types";
import type { PinState } from "@/services/status-view";

/** [緯度, 経度] */
export type LatLng = readonly [number, number];

export interface Bounds {
  latMin: number;
  latMax: number;
  lngMin: number;
  lngMax: number;
}

/** 輪郭の中の塗り。none は未確認（塗らない） */
export type ParcelFill = "none" | "ready" | "done";

/** 地図の 1 区画の見え方 */
export interface ParcelAppearance {
  fill: ParcelFill;
  selected: boolean;
  benchmark: boolean;
  /** 未確定の写真の候補にこの圃場がある（小さな点） */
  unconfirmed: boolean;
}

/** 輪郭を含む最小の四角 */
export function polygonBounds(_polygon: readonly LatLng[]): Bounds {
  throw new Error("未実装");
}

/** 輪郭の重心（面積で重み付け。面積が 0 なら点の平均） */
export function polygonCentroid(_polygon: readonly LatLng[]): LatLng {
  throw new Error("未実装");
}

/** 点が輪郭の中にあるか（辺の上は保証しない） */
export function containsPoint(_polygon: readonly LatLng[], _point: LatLng): boolean {
  throw new Error("未実装");
}

/** 2 つの四角が重なるか（辺が触れるだけは重ならない） */
export function boundsOverlap(_a: Bounds, _b: Bounds): boolean {
  throw new Error("未実装");
}

/** 四角の集まりを含む最小の四角。空なら null */
export function unionBounds(_list: readonly Bounds[]): Bounds | null {
  throw new Error("未実装");
}

/** まとめ（pin）と選択・目安から、区画の見え方を決める。pin が null（まとめが読めていない）なら塗らない */
export function parcelAppearance(
  _pin: PinState | null,
  _options: { selected: boolean; benchmark: boolean },
): ParcelAppearance {
  throw new Error("未実装");
}

/** ISO の日時を日本時間の「7/21」に */
export function monthDayJst(_iso: string): string {
  throw new Error("未実装");
}

/**
 * 地図の札の行。1 行目「A-03 北の3」、2 行目は判断「可 7/21」「済 7/25」か「未確認」。
 * まとめが読めていない（summary が null）ときは 1 行目だけ（未確認と見せない）
 */
export function mapLabelLines(_field: Field, _summary: FieldSummary | null): string[] {
  throw new Error("未実装");
}

/** その年・地区の目安の畑の番号。無ければ null */
export function benchmarkFor(_benchmarks: readonly Benchmark[], _season: string, _district: string): string | null {
  throw new Error("未実装");
}
