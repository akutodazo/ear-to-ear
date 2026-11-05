import { describe, expect, it } from "vitest";
import { lineCounterKey, lineMonthEndsAt } from "./usage-limit";

// LINE の月の送信数（L8、K15）。月は日本時間で区切る
describe("lineCounterKey（L8）", () => {
  it.each([
    ["2026-11-30T14:59:59.999Z", "line:2026-11"],
    ["2026-11-30T15:00:00.000Z", "line:2026-12"],
    ["2026-12-31T14:59:59.999Z", "line:2026-12"],
    ["2026-12-31T15:00:00.000Z", "line:2027-01"],
    ["2028-02-28T15:00:00.000Z", "line:2028-02"],
    ["2026-10-31T15:00:00.000Z", "line:2026-11"],
  ])("%s → %s", (iso, key) => {
    expect(lineCounterKey(Date.parse(iso))).toBe(key);
  });

  it("どの時刻でも日本時間の年と月", () => {
    const jstMonth = (ms: number) => new Date(ms + 9 * 3600_000).toISOString().slice(0, 7);
    const step = 7 * 3600_000 + 13 * 60_000;
    for (let ms = Date.parse("2026-01-01T00:00:00.000Z"); ms < Date.parse("2027-02-01T00:00:00.000Z"); ms += step) {
      expect(lineCounterKey(ms)).toBe(`line:${jstMonth(ms)}`);
    }
  });

  it.each([1971, 1999, 2029, 2050, 2099])("%s 年の各月の日本時間 1 日 0 時の前後 1 ミリ秒", (year) => {
    for (let month = 0; month < 12; month += 1) {
      const start = Date.UTC(year, month, 1) - 9 * 3600_000;
      const prev = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 7);
      const cur = `${year}-${String(month + 1).padStart(2, "0")}`;
      expect(lineCounterKey(start - 1)).toBe(`line:${prev}`);
      expect(lineCounterKey(start)).toBe(`line:${cur}`);
    }
  });
});

describe("lineMonthEndsAt（L8）", () => {
  it.each([
    ["2026-11-05T03:21:00.000Z", "2026-11-30T15:00:00.000Z"],
    ["2026-11-30T14:59:59.999Z", "2026-11-30T15:00:00.000Z"],
    ["2026-11-30T15:00:00.000Z", "2026-12-31T15:00:00.000Z"],
    ["2026-12-31T15:00:00.000Z", "2027-01-31T15:00:00.000Z"],
    ["2028-02-01T00:00:00.000Z", "2028-02-29T15:00:00.000Z"],
    ["2027-02-10T00:00:00.000Z", "2027-02-28T15:00:00.000Z"],
  ])("%s → %s（翌月 1 日の日本時間 0 時）", (iso, end) => {
    expect(lineMonthEndsAt(Date.parse(iso))).toBe(end);
  });

  it("どの時刻でも、終わりは今より後で 31 日以内、日本時間の 1 日 0 時、鍵の月の翌月", () => {
    const step = 7 * 3600_000 + 13 * 60_000;
    for (let ms = Date.parse("2026-01-01T00:00:00.000Z"); ms < Date.parse("2027-02-01T00:00:00.000Z"); ms += step) {
      const end = Date.parse(lineMonthEndsAt(ms));
      expect(end).toBeGreaterThan(ms);
      expect(end - ms).toBeLessThanOrEqual(31 * 24 * 3600_000);
      expect(new Date(end + 9 * 3600_000).toISOString().slice(8)).toBe("01T00:00:00.000Z");
      expect(lineCounterKey(end - 1)).toBe(lineCounterKey(ms));
      expect(lineCounterKey(end)).not.toBe(lineCounterKey(ms));
    }
  });
});
