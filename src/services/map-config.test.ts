import { describe, expect, it } from "vitest";
import { FICTIONAL_AREA, MAP_TILES } from "@/config";

// 地図の下地と架空の範囲（11-04 夜の本人決定: デモも地理院タイル。P15 の書き換え）
describe("MAP_TILES（地図の下地の設定）", () => {
  it("地理院タイルの写真で、z/x/y の穴がある", () => {
    expect(MAP_TILES.url.startsWith("https://cyberjapandata.gsi.go.jp/")).toBe(true);
    expect(MAP_TILES.url).toContain("{z}/{x}/{y}");
  });

  it("出典表記は「地理院タイル」と一覧へのリンク（必須）", () => {
    expect(MAP_TILES.attribution).toContain("地理院タイル");
    expect(MAP_TILES.attribution).toContain("https://maps.gsi.go.jp/");
  });

  it("倍率の範囲は 14〜18 の中", () => {
    expect(MAP_TILES.minZoom).toBeGreaterThanOrEqual(14);
    expect(MAP_TILES.maxZoom).toBeLessThanOrEqual(18);
    expect(MAP_TILES.minZoom).toBeLessThan(MAP_TILES.maxZoom);
  });
});

describe("FICTIONAL_AREA（架空の範囲）", () => {
  it("北海道の陸の上（空知）で、約 1.7km × 1.6km の大きさは前と同じ", () => {
    expect(FICTIONAL_AREA.latMin).toBeGreaterThan(43);
    expect(FICTIONAL_AREA.latMax).toBeLessThan(44);
    expect(FICTIONAL_AREA.lngMin).toBeGreaterThan(141);
    expect(FICTIONAL_AREA.lngMax).toBeLessThan(142);
    expect(FICTIONAL_AREA.latMax - FICTIONAL_AREA.latMin).toBeCloseTo(0.015, 6);
    expect(FICTIONAL_AREA.lngMax - FICTIONAL_AREA.lngMin).toBeCloseTo(0.02, 6);
  });
});
