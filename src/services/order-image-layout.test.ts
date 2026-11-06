import { describe, expect, it } from "vitest";
import { orderImageLayout, ORDER_IMAGE_SIZE, safeInsetX, THUMBNAIL_CROP_RATIO } from "./order-image-layout";

describe("safeInsetX（サムネイルで左右が切られる幅）", () => {
  it("1080×1200 を 3:4 に切ると左右 90px ずつ切れる", () => {
    expect(safeInsetX(1080, 1200, 3 / 4)).toBe(90);
  });

  it("切られないほど細い絵なら 0", () => {
    expect(safeInsetX(800, 1200, 3 / 4)).toBe(0);
  });
});

describe("orderImageLayout（見出し・注記・出典・区画を切られる幅の内側に）", () => {
  const { width, height } = ORDER_IMAGE_SIZE;
  const inset = safeInsetX(width, height, THUMBNAIL_CROP_RATIO);
  const layout = orderImageLayout();

  it("LINE の切り方は 3:4（11-06 の iPhone の LINE で見た、推定）", () => {
    expect(THUMBNAIL_CROP_RATIO).toBe(3 / 4);
  });

  it("見出しと注記の左端は切られる幅より内側", () => {
    expect(layout.titleX).toBeGreaterThan(inset);
    expect(layout.noteBoxX).toBeGreaterThan(inset);
  });

  it("出典の箱の右端は切られる幅より内側（地理院タイルの出典は必須）", () => {
    expect(layout.creditBoxRight).toBeLessThan(width - inset);
  });

  it("区画を収める余白は切られる幅より広い", () => {
    expect(layout.mapPadding).toBeGreaterThan(inset);
  });
});
