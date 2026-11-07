import { describe, expect, it } from "vitest";
import { legendOpenAtStart, uploadHref } from "./map-view";

describe("legendOpenAtStart（凡例は最初の 1 回だけ開いておく、#200）", () => {
  it("見たことが無ければ開く、見たことがあれば畳む", () => {
    expect(legendOpenAtStart(false)).toBe(true);
    expect(legendOpenAtStart(true)).toBe(false);
  });
});

describe("uploadHref（地図の丸いボタン「送る」の行き先）", () => {
  it("選んでいる畑があればその番号を引き継ぐ", () => {
    expect(uploadHref("A-03")).toBe("/upload#A-03");
    expect(uploadHref(null)).toBe("/upload");
  });
});
