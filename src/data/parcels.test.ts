import { describe, expect, it } from "vitest";
import { FICTIONAL_AREA } from "@/config";
import type { Field, Parcel } from "@/types";
import { boundsOverlap, containsPoint, polygonBounds } from "@/services/parcel-geometry";
import fieldsData from "./fields.json";
import parcelsData from "./parcels.json";

// 架空の 12 区画（11-04 夜の本人決定）。圃場の一覧と 1 対 1 で、中心を含み、互いに重ならず、範囲（P15）の中
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

describe("架空の区画（src/data/parcels.json）", () => {
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

  it("区画どうしは重ならない（四角で見ても離れている）", () => {
    const bounds = parcels.map((p) => ({ id: p.fieldId, b: polygonBounds(p.polygon) }));
    for (let i = 0; i < bounds.length; i++) {
      for (let j = i + 1; j < bounds.length; j++) {
        expect(boundsOverlap(bounds[i].b, bounds[j].b), `${bounds[i].id} と ${bounds[j].id}`).toBe(false);
      }
    }
  });

  it("面積は 3〜8 ha（小麦の畑らしい大きさ。実在の畑の境界はなぞらない）", () => {
    for (const p of parcels) {
      const ha = areaHa(p.polygon);
      expect(ha, p.fieldId).toBeGreaterThanOrEqual(3);
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
