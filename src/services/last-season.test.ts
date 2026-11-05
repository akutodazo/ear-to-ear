import { describe, expect, it } from "vitest";
import { dayDiffSameYear, lastSeasonFor, lastSeasonLines, monthDay, type SeasonRecord } from "./last-season";

// 架空の昨年の記録（11-05。見比べるの画面の「昨年の同じ頃」）。場所（圃場）と年の作物・判断を分ける（輪作）
const records: SeasonRecord[] = [
  { season: "2025", fieldId: "A-03", crop: "小麦", readyAt: "2025-07-20", doneAt: "2025-07-24" },
  { season: "2025", fieldId: "A-06", crop: "大豆", readyAt: null, doneAt: null },
  { season: "2025", fieldId: "A-12", crop: "小麦", readyAt: "2025-07-27", doneAt: null },
  { season: "2024", fieldId: "A-03", crop: "小麦", readyAt: "2024-07-22", doneAt: "2024-07-26" },
];

describe("lastSeasonFor（その圃場の前の年の記録）", () => {
  it("今年の 1 つ前の年の記録を返す", () => {
    expect(lastSeasonFor(records, "A-03", "2026")?.readyAt).toBe("2025-07-20");
    expect(lastSeasonFor(records, "A-03", "2025")?.readyAt).toBe("2024-07-22");
  });

  it("無ければ null（別の年・別の圃場は混ぜない）", () => {
    expect(lastSeasonFor(records, "A-10", "2026")).toBeNull();
    expect(lastSeasonFor(records, "A-12", "2027")).toBeNull();
  });

  it("年が数字でなければ null", () => {
    expect(lastSeasonFor(records, "A-03", "ことし")).toBeNull();
  });
});

describe("monthDay・dayDiffSameYear（日付の見せ方と差）", () => {
  it("YYYY-MM-DD を「7/4」に（前の 0 は付けない）", () => {
    expect(monthDay("2025-07-04")).toBe("7/4");
    expect(monthDay("2025-12-31")).toBe("12/31");
  });

  it("読めない日付は例外", () => {
    expect(() => monthDay("2025/07/04")).toThrow(/日付ではない/);
  });

  it("年を無視して、月日の差を日数で（a が b より前なら負）", () => {
    expect(dayDiffSameYear("2026-07-19", "2025-07-24")).toBe(-5);
    expect(dayDiffSameYear("2026-07-24", "2025-07-24")).toBe(0);
    expect(dayDiffSameYear("2026-08-02", "2025-07-30")).toBe(3);
  });
});

describe("lastSeasonLines（昨年の同じ頃の文。推定はしない）", () => {
  it("記録が無ければ、無いと言う", () => {
    expect(lastSeasonLines(null, "2026", null)).toEqual(["昨年（2025年）の記録はありません"]);
  });

  it("小麦でなければ、作物だけ言って比べない（輪作）", () => {
    expect(lastSeasonLines(records[1], "2026", "2026-07-19")).toEqual(["2025年は大豆（小麦ではない）"]);
  });

  it("小麦なら、判断した日と収穫した日を言う", () => {
    expect(lastSeasonLines(records[0], "2026", null)).toEqual(["2025年は小麦", "7/20 に収穫可能と判断、7/24 に収穫済"]);
  });

  it("収穫済が無ければ、判断だけ", () => {
    expect(lastSeasonLines(records[2], "2026", null)).toEqual(["2025年は小麦", "7/27 に収穫可能と判断"]);
  });

  it("今年の最新の写真があれば、昨年の判断の日付との差を言う（日付の比較であって、収穫の予想ではない）", () => {
    expect(lastSeasonLines(records[0], "2026", "2026-07-19")[2]).toBe("今年の最新の写真（7/19）は、昨年の判断の 1 日前の日付");
    expect(lastSeasonLines(records[0], "2026", "2026-07-20")[2]).toBe("今年の最新の写真（7/20）は、昨年の判断と同じ日付");
    expect(lastSeasonLines(records[0], "2026", "2026-07-23")[2]).toBe("今年の最新の写真（7/23）は、昨年の判断の 3 日後の日付");
  });

  it("判断の日が無ければ、差は言わない", () => {
    const noReady: SeasonRecord = { season: "2025", fieldId: "A-01", crop: "小麦", readyAt: null, doneAt: "2025-07-28" };
    expect(lastSeasonLines(noReady, "2026", "2026-07-19")).toEqual(["2025年は小麦", "7/28 に収穫済"]);
    const nothing: SeasonRecord = { season: "2025", fieldId: "A-01", crop: "小麦", readyAt: null, doneAt: null };
    expect(lastSeasonLines(nothing, "2026", null)).toEqual(["2025年は小麦", "判断の記録なし"]);
  });
});
