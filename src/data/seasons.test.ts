import { describe, expect, it } from "vitest";
import type { Field } from "@/types";
import type { SeasonRecord } from "@/services/last-season";
import fieldsData from "./fields.json";
import seasonsData from "./seasons.json";

// 架空の昨年（2025）の記録（11-05）。見比べるの「昨年の同じ頃」に使う。実在の収穫日ではない（K10）
const fields: Field[] = fieldsData;
const seasons: SeasonRecord[] = seasonsData;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

describe("架空の昨年の記録（src/data/seasons.json）", () => {
  it("圃場は一覧にあるものだけで、同じ年・同じ圃場は 1 件", () => {
    const ids = new Set(fields.map((f) => f.id));
    const keys = new Set<string>();
    for (const r of seasons) {
      expect(ids.has(r.fieldId), r.fieldId).toBe(true);
      const key = `${r.season}/${r.fieldId}`;
      expect(keys.has(key), key).toBe(false);
      keys.add(key);
    }
  });

  it("年は 2025 で、日付は YYYY-MM-DD か null。判断の日は収穫の日より後にならない", () => {
    for (const r of seasons) {
      expect(r.season).toBe("2025");
      for (const d of [r.readyAt, r.doneAt]) {
        if (d !== null) expect(d, r.fieldId).toMatch(DATE);
      }
      if (r.readyAt !== null && r.doneAt !== null) expect(r.readyAt <= r.doneAt, r.fieldId).toBe(true);
    }
  });

  it("小麦でない年（輪作）と、記録の無い圃場がある（全部そろった見本にしない）", () => {
    expect(seasons.some((r) => r.crop !== "小麦")).toBe(true);
    expect(seasons.length).toBeLessThan(fields.length);
  });

  it("小麦の記録は 7 月（架空の範囲の季節に合わせる）", () => {
    for (const r of seasons) {
      if (r.crop !== "小麦") continue;
      for (const d of [r.readyAt, r.doneAt]) {
        if (d !== null) expect(d.slice(5, 7), r.fieldId).toBe("07");
      }
    }
  });
});
