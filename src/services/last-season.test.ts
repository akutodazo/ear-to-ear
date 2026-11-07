import { describe, expect, it } from "vitest";
import { isoToJstDate, lastSeasonFor, lastSeasonLines, monthDay, type SeasonRecord } from "./last-season";

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

describe("monthDay・isoToJstDate（日付の見せ方）", () => {
  it("YYYY-MM-DD を「7/4」に（前の 0 は付けない）", () => {
    expect(monthDay("2025-07-04")).toBe("7/4");
    expect(monthDay("2025-12-31")).toBe("12/31");
  });

  it("読めない日付は例外", () => {
    expect(() => monthDay("2025/07/04")).toThrow(/日付ではない/);
  });

  it("ISO の日時を日本時間の YYYY-MM-DD に（日をまたぐ例）", () => {
    expect(isoToJstDate("2026-07-21T20:30:00.000Z")).toBe("2026-07-22");
    expect(isoToJstDate("2026-07-22T01:00:00.000Z")).toBe("2026-07-22");
  });

  it("読めない日時は例外", () => {
    expect(() => isoToJstDate("きのう")).toThrow(/日時ではない/);
  });
});

describe("lastSeasonLines（昨年と今年を同じ形で並べる。差や予想は出さない。精査 #2）", () => {
  it("記録が無ければ、無いと言う", () => {
    expect(lastSeasonLines(null, "2026", null)).toEqual(["昨年（2025年）の記録はありません"]);
  });

  it("小麦でなければ、作物だけ言って比べない（輪作）", () => {
    expect(lastSeasonLines(records[1], "2026", { readyAt: "2026-07-22", doneAt: null })).toEqual(["2025年は大豆（小麦ではない）"]);
  });

  it("小麦なら、昨年の判断した日と収穫した日。今年の判断が無ければ、無いと言う", () => {
    expect(lastSeasonLines(records[0], "2026", null)).toEqual(["2025年は小麦", "昨年 7/20 に収穫可能と判断、7/24 に収穫済", "今年 まだ判断はありません"]);
  });

  it("今年の判断があれば、昨年と同じ形で並べる（差の日数は言わない）", () => {
    const lines = lastSeasonLines(records[0], "2026", { readyAt: "2026-07-22", doneAt: null });
    expect(lines).toEqual(["2025年は小麦", "昨年 7/20 に収穫可能と判断、7/24 に収穫済", "今年 7/22 に収穫可能と判断"]);
    expect(lines.join("\n")).not.toMatch(/日前|日後|あと/);
  });

  it("収穫済が無ければ、判断だけ。判断の記録が何も無ければ「判断の記録なし」", () => {
    expect(lastSeasonLines(records[2], "2026", null)[1]).toBe("昨年 7/27 に収穫可能と判断");
    const nothing: SeasonRecord = { season: "2025", fieldId: "A-01", crop: "小麦", readyAt: null, doneAt: null };
    expect(lastSeasonLines(nothing, "2026", null)[1]).toBe("昨年 判断の記録なし");
  });

  it("今年の収穫済もあれば並べる", () => {
    expect(lastSeasonLines(records[0], "2026", { readyAt: "2026-07-22", doneAt: "2026-07-26" })[2]).toBe("今年 7/22 に収穫可能と判断、7/26 に収穫済");
  });
});
