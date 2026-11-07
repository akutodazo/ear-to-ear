import { describe, expect, it } from "vitest";
import { FICTIONAL_AREA } from "@/config";
import type { Field, Parcel } from "@/types";
import { containsPoint, polygonBounds, polygonsOverlap } from "@/services/parcel-geometry";
import fieldsData from "./fields.json";
import parcelsData from "./parcels.json";

// 12 区画。形は架空の範囲の中に限り、空中写真（地理院タイル）の畑の境目からなぞった（11-07 本人決定、#199。番号・名前・判断は架空）。
// 圃場の一覧と 1 対 1 で、中心を含み、互いに重ならず、範囲（P15）の中
const fields: Field[] = fieldsData;
// JSON の型は number[][] なので、[lat, lng] の組に読み替える（中身は下のテストで確かめる）
const parcels: Parcel[] = parcelsData.map((p) => ({ fieldId: p.fieldId, polygon: p.polygon.map(([lat, lng]) => [lat, lng] as [number, number]) }));

/** 地球を球として 1 度あたりのおよその距離（m） */
const M_PER_DEG_LAT = 111_320;
const M_PER_DEG_LNG = 111_320 * Math.cos((43.24 * Math.PI) / 180);

/** 輪郭のおよその面積（ha。靴ひも公式を m に直して） */
function areaHa(polygon: readonly (readonly [number, number])[]): number {
  let sum = 0;
  for (let i = 0; i < polygon.length; i++) {
    const [lat1, lng1] = polygon[i];
    const [lat2, lng2] = polygon[(i + 1) % polygon.length];
    sum += lng1 * M_PER_DEG_LNG * (lat2 * M_PER_DEG_LAT) - lng2 * M_PER_DEG_LNG * (lat1 * M_PER_DEG_LAT);
  }
  return Math.abs(sum) / 2 / 10_000;
}

describe("区画（src/data/parcels.json）", () => {
  it("圃場の一覧と同じ数・同じ順で、番号が 1 対 1", () => {
    expect(parcels.map((p) => p.fieldId)).toEqual(fields.map((f) => f.id));
  });

  it("輪郭は 4 点以上で、座標は数", () => {
    for (const p of parcels) {
      expect(p.polygon.length).toBeGreaterThanOrEqual(4);
      for (const [lat, lng] of p.polygon) {
        expect(Number.isFinite(lat)).toBe(true);
        expect(Number.isFinite(lng)).toBe(true);
      }
    }
  });

  it("すべての点が架空の範囲（P15）の中（K10）", () => {
    for (const p of parcels) {
      for (const [lat, lng] of p.polygon) {
        expect(lat).toBeGreaterThanOrEqual(FICTIONAL_AREA.latMin);
        expect(lat).toBeLessThanOrEqual(FICTIONAL_AREA.latMax);
        expect(lng).toBeGreaterThanOrEqual(FICTIONAL_AREA.lngMin);
        expect(lng).toBeLessThanOrEqual(FICTIONAL_AREA.lngMax);
      }
    }
  });

  it("輪郭は圃場の中心（fields.json の lat・lng）を含む", () => {
    for (const p of parcels) {
      const f = fields.find((x) => x.id === p.fieldId)!;
      expect(containsPoint(p.polygon, [f.lat, f.lng]), p.fieldId).toBe(true);
    }
  });

  it("区画どうしは重ならない（形で見る。傾いた帯は四角で見ると重なって見えるので bounds では見ない）", () => {
    for (let i = 0; i < parcels.length; i++) {
      for (let j = i + 1; j < parcels.length; j++) {
        expect(polygonsOverlap(parcels[i].polygon, parcels[j].polygon), `${parcels[i].fieldId} と ${parcels[j].fieldId}`).toBe(false);
      }
    }
  });

  it("同じ形の繰り返しではない（幅・長さが違う。面積を 0.5 ha 刻みで見て 4 種類以上）", () => {
    const kinds = new Set(parcels.map((p) => Math.round(areaHa(p.polygon) * 2)));
    expect(kinds.size).toBeGreaterThanOrEqual(4);
  });

  it("畑の形（隣り合う 2 辺の比は 1〜4。空中写真の畑の境目に沿った四角）", () => {
    const side = (a: readonly [number, number], c: readonly [number, number]) => Math.hypot((a[0] - c[0]) * M_PER_DEG_LAT, (a[1] - c[1]) * M_PER_DEG_LNG);
    for (const p of parcels) {
      const [p0, p1, p2] = p.polygon;
      const ratio = Math.max(side(p0, p1), side(p1, p2)) / Math.min(side(p0, p1), side(p1, p2));
      expect(ratio, `${p.fieldId} ${JSON.stringify(polygonBounds(p.polygon))}`).toBeGreaterThanOrEqual(1);
      expect(ratio, p.fieldId).toBeLessThanOrEqual(4);
    }
  });

  it("面積は 0.5〜8 ha（空中写真に写る畑の大きさ）", () => {
    for (const p of parcels) {
      const ha = areaHa(p.polygon);
      expect(ha, p.fieldId).toBeGreaterThanOrEqual(0.5);
      expect(ha, p.fieldId).toBeLessThanOrEqual(8);
    }
  });

  it("機械的に置いた四角そのものではなく、少し崩してある（4 辺が軸に平行ではない）", () => {
    for (const p of parcels) {
      const lats = new Set(p.polygon.map(([lat]) => lat));
      const lngs = new Set(p.polygon.map(([, lng]) => lng));
      expect(lats.size + lngs.size, p.fieldId).toBeGreaterThan(4);
    }
  });
});
