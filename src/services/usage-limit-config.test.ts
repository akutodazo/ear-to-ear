import { describe, expect, it, vi } from "vitest";

// 枠の長さを変えたら追従することを、設定を差し替えて確かめる（攻撃役の指摘: 600_000 の直書きでも通っていた）
vi.mock("../config", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../config")>()),
  LOGIN_WINDOW_MINUTES: 5,
}));

describe("usage-limit は config に従う", () => {
  it("枠の長さは LOGIN_WINDOW_MINUTES から（5 分）", async () => {
    const { LOGIN_WINDOW_MS, loginWindow } = await import("./usage-limit");
    expect(LOGIN_WINDOW_MS).toBe(300_000);
    expect(loginWindow(Date.parse("2026-11-03T00:07:00.000Z"))).toStrictEqual({
      slot: "2026-11-03T00:05",
      startMs: Date.parse("2026-11-03T00:05:00.000Z"),
      endMs: Date.parse("2026-11-03T00:10:00.000Z"),
      expiresAt: "2026-11-03T00:10:00.000Z",
    });
  });

});
