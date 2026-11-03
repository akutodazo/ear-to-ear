import { describe, expect, it, vi } from "vitest";

// 枠の長さと上限を変えたら追従することを、設定を差し替えて確かめる（攻撃役の指摘: 600_000 と 4 の直書きでも通っていた）
vi.mock("../config", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../config")>()),
  LOGIN_WINDOW_MINUTES: 5,
  LOGIN_MAX_ATTEMPTS_PER_WINDOW: 3,
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

  it("上限は LOGIN_MAX_ATTEMPTS_PER_WINDOW から（3 回）", async () => {
    const { isLoginLimited } = await import("./usage-limit");
    expect(isLoginLimited(2)).toBe(false);
    expect(isLoginLimited(3)).toBe(true);
  });
});
