import { describe, expect, it } from "vitest";
import { claudeDayEndsAt, lineCounterKey, linePhotoCounterKey } from "./usage-limit";

// LINE から受け取る写真の 1 日の枚数（L9、#172）。日は日本時間で区切る（Claude の回数と同じ）
describe("linePhotoCounterKey（#172）", () => {
  it.each([
    ["2026-11-06T14:59:59.999Z", "line-photo:2026-11-06"],
    ["2026-11-06T15:00:00.000Z", "line-photo:2026-11-07"],
    ["2026-12-31T15:00:00.000Z", "line-photo:2027-01-01"],
    ["2028-02-28T15:00:00.000Z", "line-photo:2028-02-29"],
  ])("%s → %s", (iso, key) => {
    expect(linePhotoCounterKey(Date.parse(iso))).toBe(key);
  });

  it("LINE の月の送信数（line:）とは別の key（月の上限に数えない）", () => {
    const ms = Date.parse("2026-11-06T03:00:00.000Z");
    expect(linePhotoCounterKey(ms)).not.toBe(lineCounterKey(ms));
    expect(linePhotoCounterKey(ms).startsWith("line:")).toBe(false);
  });

  it("日の終わり（期限）は Claude の回数と同じ日本時間 0 時で区切る", () => {
    const ms = Date.parse("2026-11-06T03:00:00.000Z");
    expect(claudeDayEndsAt(ms)).toBe("2026-11-06T15:00:00.000Z");
  });
});
