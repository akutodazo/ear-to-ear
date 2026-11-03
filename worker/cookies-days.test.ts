import { describe, expect, it, vi } from "vitest";

// SESSION_DAYS を変えたら Max-Age が追従することを、設定を差し替えて確かめる（攻撃役の指摘: 直書きでも通っていた）
vi.mock("@/config", () => ({ SESSION_DAYS: 7 }));

describe("buildSessionCookie の日数", () => {
  it("Max-Age は SESSION_DAYS から計算する", async () => {
    const { buildSessionCookie } = await import("./cookies");
    expect(buildSessionCookie("t")).toBe("session=t; Path=/; Max-Age=604800; HttpOnly; Secure; SameSite=Lax");
  });
});
