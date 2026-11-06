import { describe, expect, it } from "vitest";
import type { Field, HandoverNote } from "@/types";
import type { SeasonRecord } from "@/services/last-season";
import fieldsData from "./fields.json";
import seasonsData from "./seasons.json";
import notesData from "./handover-2025.json";

// 昨年（2025）の引き継ぎメモの架空の例（5 段目、11-05 本人決定: 画面だけ・架空の JSON）。手で書いたもので、Claude が作ったメモではない
const fields: Field[] = fieldsData;
const seasons: SeasonRecord[] = seasonsData;
const notes = notesData as HandoverNote[];
const DATE_IN_TEXT = /\d{4}-\d{2}-\d{2}/g;

describe("昨年の引き継ぎメモの架空の例（src/data/handover-2025.json）", () => {
  it("1 件以上、圃場ごとに 1 件まで", () => {
    expect(notes.length).toBeGreaterThan(0);
    expect(new Set(notes.map((n) => n.fieldId)).size).toBe(notes.length);
  });

  it("どれも 2025 年、一覧にある圃場、昨年は小麦の圃場、model は「架空の例」", () => {
    for (const n of notes) {
      expect(n.season).toBe("2025");
      expect(fields.some((f) => f.id === n.fieldId)).toBe(true);
      expect(seasons.find((s) => s.fieldId === n.fieldId && s.season === "2025")?.crop).toBe("小麦");
      expect(n.model).toBe("架空の例");
    }
  });

  it("引用は記録の範囲の中（start < end）", () => {
    for (const n of notes) {
      for (const b of n.blocks) {
        for (const c of b.cites) {
          expect(c.start).toBeGreaterThanOrEqual(0);
          expect(c.start).toBeLessThan(c.end);
          expect(c.end).toBeLessThanOrEqual(n.records.length);
        }
      }
    }
  });

  it("記録の日付は 2025 年で、判断の日は昨年の記録（seasons.json）と同じ", () => {
    for (const n of notes) {
      const season = seasons.find((s) => s.fieldId === n.fieldId && s.season === "2025");
      for (const r of n.records) {
        for (const d of r.text.match(DATE_IN_TEXT) ?? []) expect(d.startsWith("2025-")).toBe(true);
        if (r.kind === "status") {
          const d = r.text.match(DATE_IN_TEXT)?.[0];
          expect([season?.readyAt, season?.doneAt]).toContain(d);
        }
      }
    }
  });

  it("日数の差・「あと n 日」・水分の数字を言わない（K11・K16）", () => {
    for (const n of notes) {
      for (const b of n.blocks) {
        expect(b.text).not.toMatch(/あと\s*\d+\s*日|\d+\s*日(後|前|早|遅)/);
        expect(b.text).not.toMatch(/\d+(\.\d+)?\s*%/);
      }
    }
  });
});
