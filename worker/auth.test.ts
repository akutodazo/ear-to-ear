import { describe, expect, it } from "vitest";
import { authenticate, authorize, requireSession, type AuthResult } from "./auth";
import type { AuthLevel } from "./deps";
import { fakeDeps, NOW_SEC, request, sessionToken } from "./test-helpers";

const member = { device: "dev-member", role: "member" as const, exp: NOW_SEC + 60 };
const admin = { device: "dev-admin", role: "admin" as const, exp: NOW_SEC + 60 };

describe("authenticate", () => {
  it("Cookie が無ければ anonymous", async () => {
    expect(await authenticate(request("GET", "/api/x"), fakeDeps())).toEqual({ kind: "anonymous" });
  });

  it("session 以外の Cookie だけなら anonymous", async () => {
    expect(await authenticate(request("GET", "/api/x", "other=1"), fakeDeps())).toEqual({
      kind: "anonymous",
    });
  });

  it.each(["member", "admin"] as const)("正しい %s の Cookie は ok で中身が一致", async (role) => {
    const cookie = `session=${await sessionToken(role)}`;
    expect(await authenticate(request("GET", "/api/x", cookie), fakeDeps())).toEqual({
      kind: "ok",
      claims: role === "member" ? member : admin,
    });
  });

  it("壊れた Cookie は invalid", async () => {
    expect(await authenticate(request("GET", "/api/x", "session=abc.def"), fakeDeps())).toEqual({
      kind: "invalid",
    });
  });

  it("期限切れは invalid（deps.nowMs をミリ秒として秒に直して比べる）", async () => {
    const cookie = `session=${await sessionToken("member", NOW_SEC)}`;
    expect(await authenticate(request("GET", "/api/x", cookie), fakeDeps())).toEqual({
      kind: "invalid",
    });
  });

  it("期限の 1 秒前は ok", async () => {
    const cookie = `session=${await sessionToken("member", NOW_SEC + 1)}`;
    const result = await authenticate(request("GET", "/api/x", cookie), fakeDeps());
    expect(result.kind).toBe("ok");
  });

  it("別の鍵の Cookie は invalid", async () => {
    const cookie = `session=${await sessionToken("admin", NOW_SEC + 60, Buffer.alloc(32, 0x02))}`;
    expect(await authenticate(request("GET", "/api/x", cookie), fakeDeps())).toEqual({
      kind: "invalid",
    });
  });

  it("hmac の例外は握らずにそのまま出す", async () => {
    const cookie = `session=${await sessionToken("member")}`;
    const deps = fakeDeps({
      hmac: async () => {
        throw new Error("hmac broken");
      },
    });
    await expect(authenticate(request("GET", "/api/x", cookie), deps)).rejects.toThrow(/hmac broken/);
  });
});

describe("authorize", () => {
  const anonymous: AuthResult = { kind: "anonymous" };
  const invalid: AuthResult = { kind: "invalid" };
  const asMember: AuthResult = { kind: "ok", claims: member };
  const asAdmin: AuthResult = { kind: "ok", claims: admin };

  it.each([
    ["none", anonymous, { ok: true, session: null }],
    ["none", invalid, { ok: true, session: null }],
    ["none", asMember, { ok: true, session: null }],
    ["none", asAdmin, { ok: true, session: null }],
    ["member", anonymous, { ok: false, status: 401 }],
    ["member", invalid, { ok: false, status: 401 }],
    ["member", asMember, { ok: true, session: member }],
    ["member", asAdmin, { ok: true, session: admin }],
    ["admin", anonymous, { ok: false, status: 401 }],
    ["admin", invalid, { ok: false, status: 401 }],
    ["admin", asMember, { ok: false, status: 403 }],
    ["admin", asAdmin, { ok: true, session: admin }],
  ] as [AuthLevel, AuthResult, unknown][])("%s に %j は %j", (level, result, expected) => {
    expect(authorize(level, result)).toEqual(expected);
  });
});

describe("requireSession", () => {
  it("session があれば返す", () => {
    const ctx = { url: new URL("https://example.test/"), params: {}, session: member, deps: fakeDeps() };
    expect(requireSession(ctx)).toEqual(member);
  });

  it("session が null なら例外", () => {
    const ctx = { url: new URL("https://example.test/"), params: {}, session: null, deps: fakeDeps() };
    expect(() => requireSession(ctx)).toThrow(/session/);
  });
});
