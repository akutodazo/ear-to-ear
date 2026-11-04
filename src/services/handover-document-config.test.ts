import { describe, expect, it, vi } from "vitest";
import type { StatusEvent } from "@/types";
import { buildHandoverRecords } from "./handover-document";

// 攻撃役（T27 の 1 回目）: 理由のラベルを手で書いた表でも通った（今の設定と同じ 5 つだったため）。
// 定数は src/config.ts に 1 回だけなので、設定を差し替えて追従することを確かめる
vi.mock("@/config", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/config")>()),
  STATUS_REASONS: [
    { code: "aa", label: "甲" },
    { code: "ear_color", label: "乙" },
  ],
}));

function event(reasons: string[]): StatusEvent {
  return {
    id: 1,
    fieldId: "A-06",
    status: "ready",
    reasons,
    note: null,
    refPhotoIds: [],
    actorDevice: "dev-1",
    at: "2026-07-21T01:00:00.000Z",
    revokedAt: null,
  };
}

describe("buildHandoverRecords: 理由のラベルは設定に従う（T27）", () => {
  it("設定にあるコードは設定のラベルで書く", () => {
    const [record] = buildHandoverRecords("A-06", "2026", [event(["aa", "ear_color"])], []);
    expect(record.text).toBe("[判断 1] 2026-07-21 収穫可能。理由: 甲・乙。");
  });

  it("設定に無いコードは、前の設定にあったものでも例外", () => {
    expect(() => buildHandoverRecords("A-06", "2026", [event(["yellow_ratio"])], [])).toThrow(/理由のコード/);
  });
});
