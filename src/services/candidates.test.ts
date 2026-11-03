import { describe, expect, it } from "vitest";
import { MAX_CANDIDATES } from "../config";
import type { Field } from "../types";
import { candidateFieldIds, distanceMeters } from "./candidates";

// 架空の圃場（P15 の沖合の四角の中）。テストのためだけの値
function field(id: string, lat: number, lng: number): Field {
  return { id, name: `圃場 ${id}`, lat, lng, district: "A" };
}

const here = { lat: 41.805, lng: 144.51 };

describe("candidateFieldIds（候補の圃場を近い順に）", () => {
  it("近い順に、圃場の番号だけを返す（距離は返さない。K6）", () => {
    const fields = [
      field("A-01", 41.809, 144.51), // 北へ約445m
      field("A-02", 41.806, 144.51), // 北へ約111m
      field("A-03", 41.807, 144.51), // 北へ約222m
    ];
    expect(candidateFieldIds(here, fields)).toEqual(["A-02", "A-03", "A-01"]);
  });

  it("既定では最大 MAX_CANDIDATES 件", () => {
    const fields = [
      field("A-01", 41.801, 144.51),
      field("A-02", 41.802, 144.51),
      field("A-03", 41.803, 144.51),
      field("A-04", 41.804, 144.51),
      field("A-05", 41.8045, 144.51),
    ];
    const result = candidateFieldIds(here, fields);
    expect(result).toHaveLength(MAX_CANDIDATES);
    expect(result).toEqual(["A-05", "A-04", "A-03"]);
  });

  it("件数を渡すと、その件数まで", () => {
    const fields = [field("A-01", 41.807, 144.51), field("A-02", 41.806, 144.51)];
    expect(candidateFieldIds(here, fields, 1)).toEqual(["A-02"]);
  });

  it("圃場が件数より少なければ、あるだけ返す", () => {
    const fields = [field("A-01", 41.807, 144.51), field("A-02", 41.806, 144.51)];
    expect(candidateFieldIds(here, fields)).toEqual(["A-02", "A-01"]);
  });

  it("位置が null なら空配列", () => {
    const fields = [field("A-01", 41.806, 144.51)];
    expect(candidateFieldIds(null, fields)).toEqual([]);
  });

  it("圃場が無ければ空配列", () => {
    expect(candidateFieldIds(here, [])).toEqual([]);
  });

  it("距離が同じなら番号の昇順（毎回同じ順に並ぶ）", () => {
    // 南北に対称に置くと、小数の誤差で距離がわずかにずれる。同じ位置に置いて確実に同じ距離にする
    const fields = [field("A-07", 41.806, 144.51), field("A-03", 41.806, 144.51)];
    expect(candidateFieldIds(here, fields)).toEqual(["A-03", "A-07"]);
  });

  it("経度の1度は緯度の1度より短い（度の差のままで比べない）", () => {
    const fields = [
      field("A-01", 41.806, 144.51), // 北へ 0.0010度 ＝ 約111m
      field("A-02", 41.805, 144.5112), // 東へ 0.0012度 ＝ 約99m
    ];
    expect(candidateFieldIds(here, fields)).toEqual(["A-02", "A-01"]);
  });

  it("渡された圃場の配列を並べ替えない", () => {
    const fields = Object.freeze([
      field("A-01", 41.809, 144.51),
      field("A-02", 41.806, 144.51),
    ]);
    expect(candidateFieldIds(here, fields)).toEqual(["A-02", "A-01"]);
    expect(fields.map((f) => f.id)).toEqual(["A-01", "A-02"]);
  });
});

describe("distanceMeters（画面に出すだけの距離）", () => {
  it("同じ点は 0m", () => {
    expect(distanceMeters(here, here)).toBe(0);
  });

  it("北へ 0.001度は約111m（ハバーサイン、地球の半径 6,371km）", () => {
    const d = distanceMeters({ lat: 41.8, lng: 144.5 }, { lat: 41.801, lng: 144.5 });
    expect(d).toBeCloseTo(111.19, 1);
  });

  it("北緯41.8度で東へ 0.001度は約83m", () => {
    const d = distanceMeters({ lat: 41.8, lng: 144.5 }, { lat: 41.8, lng: 144.501 });
    expect(d).toBeCloseTo(82.89, 1);
  });

  it("向きを入れ替えても同じ距離", () => {
    const a = { lat: 41.801, lng: 144.503 };
    const b = { lat: 41.812, lng: 144.517 };
    expect(distanceMeters(a, b)).toBeCloseTo(distanceMeters(b, a), 6);
  });
});
