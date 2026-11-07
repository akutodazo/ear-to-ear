import { describe, expect, it } from "vitest";
import { fieldIdFromHash, unconfirmedHash } from "./field-hash";

// 画面をまたいで畑を引き継ぐ URL の #（精査 5 回目 #5: 送る画面が畑を覚えていない）。純粋関数
const ids = ["A-01", "A-02", "A-03"];

describe("fieldIdFromHash（#A-01 から一覧にある番号だけを読む）", () => {
  it("一覧にある番号なら返す", () => {
    expect(fieldIdFromHash("#A-01", ids)).toBe("A-01");
    expect(fieldIdFromHash("#A-03", ids)).toBe("A-03");
  });

  it("無い・一覧に無い・形が違う・ほかの文字が付くときは null", () => {
    expect(fieldIdFromHash("", ids)).toBeNull();
    expect(fieldIdFromHash("#", ids)).toBeNull();
    expect(fieldIdFromHash("#A-09", ids)).toBeNull();
    expect(fieldIdFromHash("#a-01", ids)).toBeNull();
    expect(fieldIdFromHash("A-01", ids)).toBeNull();
    expect(fieldIdFromHash("#A-01&x", ids)).toBeNull();
    expect(fieldIdFromHash("#unconfirmed", ids)).toBeNull();
  });
});

describe("unconfirmedHash（新着を「未確定だけ見る」で開く #。精査 5 回目 #1）", () => {
  it("#unconfirmed のときだけ true", () => {
    expect(unconfirmedHash("#unconfirmed")).toBe(true);
    expect(unconfirmedHash("")).toBe(false);
    expect(unconfirmedHash("#A-01")).toBe(false);
    expect(unconfirmedHash("#unconfirmed-x")).toBe(false);
  });
});
