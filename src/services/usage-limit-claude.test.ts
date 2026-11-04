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
