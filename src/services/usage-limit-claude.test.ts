import { describe, expect, it } from "vitest";
import { claudeCounterKey, claudeDayEndsAt } from "./usage-limit";

// Claude の 1 日の回数（T31）。日は日本時間で区切る（委員の 1 日と合わせる）
describe("claudeCounterKey（T31）", () => {
  it.each([
    ["2026-11-04T14:59:59.999Z", "claude:2026-11-04"],
    ["2026-11-04T15:00:00.000Z", "claude:2026-11-05"],
    ["2026-11-05T00:00:00.000Z", "claude:2026-11-05"],
    ["2025-12-31T15:00:00.000Z", "claude:2026-01-01"],
    ["2028-02-28T15:00:00.000Z", "claude:2028-02-29"],
  ])("%s → %s", (iso, key) => {
    expect(claudeCounterKey(Date.parse(iso))).toBe(key);
  });
});

// 攻撃役（T31 の 1 回目）: テストに出る 5 つの時刻の表で返しても通った
describe("claudeCounterKey: どの時刻でも日本時間の日付（T31）", () => {
  it("2 日分を 37 分ずつと、日本時間 0 時の前後 1 ミリ秒", () => {
    const jstDate = (ms: number) => new Date(ms + 9 * 3600_000).toISOString().slice(0, 10);
    for (let ms = Date.parse("2026-12-30T00:00:00.000Z"); ms < Date.parse("2027-01-02T00:00:00.000Z"); ms += 37 * 60_000) {
      expect(claudeCounterKey(ms)).toBe(`claude:${jstDate(ms)}`);
    }
    const midnight = Date.parse("2026-12-31T15:00:00.000Z");
    expect(claudeCounterKey(midnight - 1)).toBe("claude:2026-12-31");
    expect(claudeCounterKey(midnight)).toBe("claude:2027-01-01");
  });

  // 攻撃役（T31 の 2 回目）: 2029 年より前だけを計算しても通った
  it.each([1971, 1999, 2029, 2050, 2099])("%s 年の 3 月 1 日の日本時間 0 時の前後と、日の終わり", (year) => {
    const midnight = Date.UTC(year, 2, 1) - 9 * 3600_000;
    const prevDay = new Date(Date.UTC(year, 2, 0)).toISOString().slice(0, 10);
    expect(claudeCounterKey(midnight - 1)).toBe(`claude:${prevDay}`);
    expect(claudeCounterKey(midnight)).toBe(`claude:${year}-03-01`);
    expect(claudeDayEndsAt(midnight - 1)).toBe(new Date(midnight).toISOString());
    expect(claudeDayEndsAt(midnight + 5 * 3600_000)).toBe(new Date(midnight + 24 * 3600_000).toISOString());
  });
});

describe("claudeDayEndsAt（T31）", () => {
  it.each([
    ["2026-11-04T14:59:59.999Z", "2026-11-04T15:00:00.000Z"],
    ["2026-11-04T15:00:00.000Z", "2026-11-05T15:00:00.000Z"],
    ["2026-11-05T03:21:00.000Z", "2026-11-05T15:00:00.000Z"],
    ["2026-12-31T15:00:00.000Z", "2027-01-01T15:00:00.000Z"],
    ["2028-02-28T16:00:00.000Z", "2028-02-29T15:00:00.000Z"],
  ])("%s → %s（翌日の日本時間 0 時）", (iso, end) => {
    expect(claudeDayEndsAt(Date.parse(iso))).toBe(end);
  });

  it("どの時刻でも、終わりは今より後で 24 時間以内", () => {
    for (let ms = Date.parse("2026-11-04T00:00:00.000Z"); ms < Date.parse("2026-11-06T00:00:00.000Z"); ms += 37 * 60_000) {
      const end = Date.parse(claudeDayEndsAt(ms));
      expect(end).toBeGreaterThan(ms);
      expect(end - ms).toBeLessThanOrEqual(24 * 3600_000);
    }
  });
});
