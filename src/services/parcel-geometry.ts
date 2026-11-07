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
export function polygonBounds(polygon: readonly LatLng[]): Bounds {
  if (polygon.length === 0) throw new Error("輪郭に点が無い");
  let latMin = Infinity;
  let latMax = -Infinity;
  let lngMin = Infinity;
  let lngMax = -Infinity;
  for (const [lat, lng] of polygon) {
    if (lat < latMin) latMin = lat;
    if (lat > latMax) latMax = lat;
    if (lng < lngMin) lngMin = lng;
    if (lng > lngMax) lngMax = lng;
  }
  return { latMin, latMax, lngMin, lngMax };
}

/** 輪郭の重心（面積で重み付け。面積が 0 なら点の平均） */
export function polygonCentroid(polygon: readonly LatLng[]): LatLng {
  if (polygon.length === 0) throw new Error("輪郭に点が無い");
  // 緯度・経度は大きな数なので、最初の点を原点にして計算する（桁落ちを防ぐ）
  const [lat0, lng0] = polygon[0];
  let twiceArea = 0;
  let latSum = 0;
  let lngSum = 0;
  for (let i = 0; i < polygon.length; i++) {
    const lat1 = polygon[i][0] - lat0;
    const lng1 = polygon[i][1] - lng0;
    const lat2 = polygon[(i + 1) % polygon.length][0] - lat0;
    const lng2 = polygon[(i + 1) % polygon.length][1] - lng0;
    const cross = lat1 * lng2 - lat2 * lng1;
    twiceArea += cross;
    latSum += (lat1 + lat2) * cross;
    lngSum += (lng1 + lng2) * cross;
  }
  if (Math.abs(twiceArea) < 1e-15) {
    const n = polygon.length;
    return [polygon.reduce((a, [lat]) => a + lat, 0) / n, polygon.reduce((a, [, lng]) => a + lng, 0) / n];
  }
  return [lat0 + latSum / (3 * twiceArea), lng0 + lngSum / (3 * twiceArea)];
}

/** 点が輪郭の中にあるか（辺の上は保証しない）。半直線が辺と交わる回数の偶奇 */
export function containsPoint(polygon: readonly LatLng[], point: LatLng): boolean {
  const [lat, lng] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [latI, lngI] = polygon[i];
    const [latJ, lngJ] = polygon[j];
    const crosses = latI > lat !== latJ > lat && lng < ((lngJ - lngI) * (lat - latI)) / (latJ - latI) + lngI;
    if (crosses) inside = !inside;
  }
  return inside;
}

/** 2 つの四角が重なるか（辺が触れるだけは重ならない） */
export function boundsOverlap(a: Bounds, b: Bounds): boolean {
  return a.latMin < b.latMax && b.latMin < a.latMax && a.lngMin < b.lngMax && b.lngMin < a.lngMax;
}

/** 四角の集まりを含む最小の四角。空なら null */
export function unionBounds(list: readonly Bounds[]): Bounds | null {
  if (list.length === 0) return null;
  return list.reduce((acc, b) => ({
    latMin: Math.min(acc.latMin, b.latMin),
    latMax: Math.max(acc.latMax, b.latMax),
    lngMin: Math.min(acc.lngMin, b.lngMin),
    lngMax: Math.max(acc.lngMax, b.lngMax),
  }));
}

/** まとめ（pin）と選択・目安から、区画の見え方を決める。pin が null（まとめが読めていない）なら塗らない */
export function parcelAppearance(
  pin: PinState | null,
  options: { selected: boolean; benchmark: boolean },
): ParcelAppearance {
  return {
    fill: pin === null || pin.status === "none" ? "none" : pin.status,
    selected: options.selected,
    benchmark: options.benchmark,
    unconfirmed: pin?.unconfirmed ?? false,
  };
}

const JST_MONTH_DAY = new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric" });

/** ISO の日時を日本時間の「7/21」に */
export function monthDayJst(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) throw new Error("日時ではない");
  return JST_MONTH_DAY.format(date);
}

const STATUS_MARK = { ready: "可", done: "済" } as const;

/**
 * 地図の札の行。1 行目「A-03 北の3」、2 行目は判断「可 7/21」「済 7/25」か「未確認」。
 * まとめが読めていない（summary が null）ときは 1 行目だけ（未確認と見せない）
 */
export function mapLabelLines(field: Field, summary: FieldSummary | null): string[] {
  const first = `${field.id} ${field.name}`;
  if (summary === null) return [first];
  if (summary.latest === null) return [first, "未確認"];
  return [first, `${STATUS_MARK[summary.latest.status]} ${monthDayJst(summary.latest.at)}`];
}

/** その年・地区の目安の畑の番号。無ければ null */
export function benchmarkFor(benchmarks: readonly Benchmark[], season: string, district: string): string | null {
  return benchmarks.find((b) => b.season === season && b.district === district)?.fieldId ?? null;
}

/** 線分 p1-p2 と p3-p4 が交わるか（端で触れるだけは交わらない） */
function segmentsCross(p1: LatLng, p2: LatLng, p3: LatLng, p4: LatLng): boolean {
  const orient = (a: LatLng, b: LatLng, c: LatLng) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const d1 = orient(p3, p4, p1);
  const d2 = orient(p3, p4, p2);
  const d3 = orient(p1, p2, p3);
  const d4 = orient(p1, p2, p4);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

/**
 * 2 つの輪郭が重なるか（辺が交わる、またはどちらかの点がもう一方の中）。辺が触れるだけは重ならない。
 * 傾いた帯は bounds で見ると隣どうしが重なって見えるので、区画の重なりはこちらで見る
 */
export function polygonsOverlap(a: readonly LatLng[], b: readonly LatLng[]): boolean {
  if (a.length === 0 || b.length === 0) throw new Error("輪郭に点が無い");
  for (let i = 0; i < a.length; i++) {
    const a1 = a[i];
    const a2 = a[(i + 1) % a.length];
    for (let j = 0; j < b.length; j++) {
      if (segmentsCross(a1, a2, b[j], b[(j + 1) % b.length])) return true;
    }
  }
  // 辺の上の点は「中」と数えない（containsPoint は辺の上を保証しないので、先に外す）
  const strictlyInside = (polygon: readonly LatLng[], point: LatLng) => !onBoundary(polygon, point) && containsPoint(polygon, point);
  return a.some((p) => strictlyInside(b, p)) || b.some((p) => strictlyInside(a, p));
}

/** 点が輪郭の辺の上にあるか（ほぼ一直線で、端の間） */
function onBoundary(polygon: readonly LatLng[], point: LatLng): boolean {
  const EPS = 1e-12;
  for (let i = 0; i < polygon.length; i++) {
    const [lat1, lng1] = polygon[i];
    const [lat2, lng2] = polygon[(i + 1) % polygon.length];
    const cross = (lat2 - lat1) * (point[1] - lng1) - (lng2 - lng1) * (point[0] - lat1);
    if (Math.abs(cross) > EPS) continue;
    const withinLat = point[0] >= Math.min(lat1, lat2) - EPS && point[0] <= Math.max(lat1, lat2) + EPS;
    const withinLng = point[1] >= Math.min(lng1, lng2) - EPS && point[1] <= Math.max(lng1, lng2) + EPS;
    if (withinLat && withinLng) return true;
  }
  return false;
}
