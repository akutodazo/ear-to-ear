import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { verifySessionToken } from "@/services/session-token";
import { createTestDb } from "./test-db";
import { fakeDeps, hmacWith, jsonRequest, KEY, NOW_SEC } from "./test-helpers";

// 日数・枠・上限を変えたら追従することを、設定を差し替えて確かめる（攻撃役の指摘: 2_592_000 などの直書きでも通っていた）
vi.mock("@/config", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/config")>()),
  SESSION_DAYS: 7,
  LOGIN_WINDOW_MINUTES: 5,
  LOGIN_MAX_ATTEMPTS_PER_WINDOW: 3,
}));

const MEMBER_INPUT = "member-pass-for-test";

function setup() {
  return fakeDeps({
    db: createTestDb().db,
    matchPassphrase: async (input) => (input === MEMBER_INPUT ? "member" : null),
    hashIp: async (ip, day) => createHmac("sha256", KEY).update(`ip:${day}:${ip}`).digest("base64url"),
  });
}

async function login(deps: ReturnType<typeof setup>, passphrase: string): Promise<Response> {
  const { handleRequest } = await import("./app");
  return handleRequest(
    jsonRequest("POST", "/api/session", JSON.stringify({ passphrase }), { "cf-connecting-ip": "203.0.113.7" }),
    deps,
  );
}

describe("POST /api/session は config に従う", () => {
  it("exp は SESSION_DAYS 日後（7 日）", async () => {
    const response = await login(setup(), MEMBER_INPUT);
    const setCookie = response.headers.get("set-cookie") ?? "";
    const token = setCookie.slice("session=".length, setCookie.indexOf(";"));
    expect((await verifySessionToken(token, hmacWith(KEY), NOW_SEC))?.exp).toBe(NOW_SEC + 7 * 86_400);
  });

  it("上限 3 回で 4 回目が 429、Retry-After は 5 分枠の終わりまで（07:33:20 → 07:35 で 100 秒）", async () => {
    const deps = setup();
    for (let i = 0; i < 3; i++) expect((await login(deps, "wrong")).status).toBe(401);
    const response = await login(deps, "wrong");
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("100");
  });
});
