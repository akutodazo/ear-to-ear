import { describe, expect, it } from "vitest";
import {
  FIELD_ID_PATTERN,
  LINE_MONTHLY_LIMIT,
  LINE_STOP_AT,
  MAX_CANDIDATES,
  STATUS_REASONS,
  STATUS_REF_PHOTOS_MAX,
} from "./config";

describe("config（約束事の釘打ち）", () => {
  it("候補の圃場は最大3つ（K6）", () => {
    expect(MAX_CANDIDATES).toBe(3);
  });

  it("判断の理由に農協の判定の2つが必ずある（K16）", () => {
    const codes = STATUS_REASONS.map((r) => r.code);
    expect(codes).toContain("ja_stop_moisture");
    expect(codes).toContain("ja_stop_damage");
  });

  it("判断の理由は父の答え（P21）の2つ・農協の判定の2つ・その他の5つ（11-03 本人確定）", () => {
    expect(STATUS_REASONS.map((r) => [r.code, r.label])).toStrictEqual([
      ["ear_color", "穂の色"],
      ["yellow_ratio", "黄色い穂の割合"],
      ["ja_stop_moisture", "農協の判定で中止（水分超過）"],
      ["ja_stop_damage", "農協の判定で中止（砕けなどの傷）"],
      ["other", "その他"],
    ]);
  });

  it("判断の根拠の写真は5枚まで（11-03 本人決定）", () => {
    expect(STATUS_REF_PHOTOS_MAX).toBe(5);
  });

  it("理由のコードは重複しない", () => {
    const codes = STATUS_REASONS.map((r) => r.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("圃場番号は A-01 の形だけを通す", () => {
    expect(FIELD_ID_PATTERN.test("A-01")).toBe(true);
    expect(FIELD_ID_PATTERN.test("A-1")).toBe(false);
    expect(FIELD_ID_PATTERN.test("401")).toBe(false);
  });

  it("LINE は無料枠の手前で止める（K15）", () => {
    expect(LINE_STOP_AT).toBeLessThan(LINE_MONTHLY_LIMIT);
  });
});
