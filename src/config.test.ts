import { describe, expect, it } from "vitest";
import {
  FIELD_ID_PATTERN,
  LINE_MONTHLY_LIMIT,
  LINE_STOP_AT,
  MAX_CANDIDATES,
  STATUS_REASONS,
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
