import { describe, expect, it } from "vitest";
import { fitView, projectToView, tilesForView, worldPixel } from "./tile-math";

// 地図 1 枚の絵の座標計算（11-05、4 段目）。Web メルカトル（地理院タイルと同じ 256px のタイル）。純粋関数
// 座標は架空の範囲（FICTIONAL_AREA）の中（AGENTS.md §1-6）
const bounds = { latMin: 43.2375, latMax: 43.2475, lngMin: 141.742, lngMax: 141.752 };

describe("worldPixel（緯度経度 → その倍率の世界の画素）", () => {
  it("経度 0・緯度 0 は倍率 0 で 128,128（タイル 1 枚の真ん中）", () => {
    expect(worldPixel(0, 0, 0)).toEqual({ x: 128, y: 128 });
  });

  it("倍率が 1 上がると 2 倍。東は x が大きく、北は y が小さい", () => {
    const a = worldPixel(43.24, 141.75, 15);
    const b = worldPixel(43.24, 141.75, 16);
    expect(b.x).toBeCloseTo(a.x * 2, 6);
    expect(b.y).toBeCloseTo(a.y * 2, 6);
    expect(worldPixel(43.24, 141.751, 15).x).toBeGreaterThan(a.x);
    expect(worldPixel(43.241, 141.75, 15).y).toBeLessThan(a.y);
  });
});

describe("fitView（範囲が余白込みで入る、いちばん大きな整数の倍率）", () => {
  it("1080×1080 に余白 80 で入る倍率。1 つ上の倍率では入らない", () => {
    const view = fitView(bounds, 1080, 1080, 80, 18);
    const fits = (z: number) => {
      const a = worldPixel(bounds.latMax, bounds.lngMin, z);
      const b = worldPixel(bounds.latMin, bounds.lngMax, z);
      return b.x - a.x <= 1080 - 160 && b.y - a.y <= 1080 - 160;
    };
    expect(fits(view.zoom)).toBe(true);
    expect(fits(view.zoom + 1)).toBe(false);
  });

  it("範囲の真ん中が絵の真ん中に来る", () => {
    const view = fitView(bounds, 1080, 1080, 80, 18);
    const c = projectToView(view, (bounds.latMin + bounds.latMax) / 2, (bounds.lngMin + bounds.lngMax) / 2);
    expect(c.x).toBeCloseTo(540, 0);
    expect(c.y).toBeCloseTo(540, 0);
  });

  it("倍率の上限を超えない", () => {
    const tiny = { latMin: 43.24, latMax: 43.2401, lngMin: 141.75, lngMax: 141.7501 };
    expect(fitView(tiny, 1080, 1080, 80, 17).zoom).toBe(17);
  });
});

describe("tilesForView（絵を覆うタイル）", () => {
  it("絵の四隅を覆うタイルを全部、重ならずに。各タイルの描く位置は 256 刻み", () => {
    const view = fitView(bounds, 1080, 1080, 80, 18);
    const tiles = tilesForView(view, 1080, 1080);
    const keys = new Set(tiles.map((t) => `${t.x}/${t.y}`));
    expect(keys.size).toBe(tiles.length);
    for (const t of tiles) {
      expect(t.z).toBe(view.zoom);
      expect(Math.abs((t.dx - tiles[0].dx) % 256)).toBeCloseTo(0, 6);
    }
    const minDx = Math.min(...tiles.map((t) => t.dx));
    const maxDx = Math.max(...tiles.map((t) => t.dx));
    const minDy = Math.min(...tiles.map((t) => t.dy));
    const maxDy = Math.max(...tiles.map((t) => t.dy));
    expect(minDx).toBeLessThanOrEqual(0);
    expect(minDy).toBeLessThanOrEqual(0);
    expect(maxDx + 256).toBeGreaterThanOrEqual(1080);
    expect(maxDy + 256).toBeGreaterThanOrEqual(1080);
  });
});
