import { describe, expect, it } from "vitest";
import { THUMBNAIL_LONG_EDGE_PX } from "@/config";
import { resizedSize } from "./resize-plan";

describe("resizedSize（縮小の大きさ）", () => {
  it.each([
    [4000, 3000, 1600, 1200],
    [3000, 4000, 1200, 1600],
    [4032, 3024, 1600, 1200],
    [2000, 2000, 1600, 1600],
  ])("%i×%i は %i×%i（長辺を 1600 に、比は保つ）", (w, h, ew, eh) => {
    expect(resizedSize(w, h)).toEqual({ width: ew, height: eh });
  });

  it("既定の長辺は config の THUMBNAIL_LONG_EDGE_PX", () => {
    const { width, height } = resizedSize(5000, 1000);
    expect(Math.max(width, height)).toBe(THUMBNAIL_LONG_EDGE_PX);
  });

  it("長辺がもともと小さい写真は大きくしない", () => {
    expect(resizedSize(1200, 900)).toEqual({ width: 1200, height: 900 });
  });

  it("短辺は 1px より小さくしない", () => {
    expect(resizedSize(16000, 3)).toEqual({ width: 1600, height: 1 });
  });

  it("長辺を渡せばその長さに", () => {
    expect(resizedSize(4000, 3000, 800)).toEqual({ width: 800, height: 600 });
  });
});
