import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { verifySessionToken } from "@/services/session-token";
import { handleRequest } from "./app";
import { buildSessionCookie } from "./cookies";
import type { Deps } from "./deps";
import { createTestDb, type TestDb } from "./test-db";
import { fakeDeps, hmacWith, jsonRequest, KEY, NOW_MS, NOW_SEC, request, sessionToken } from "./test-helpers";

// NOW_MS は 2026-10-26T07:33:20Z。枠は 07:30〜07:40、Retry-After は 400 秒
const SLOT = "2026-10-26T07:30";
const EXPIRES_AT = "2026-10-26T07:40:00.000Z";
const DAY = "2026-10-26";
const IP = "203.0.113.7";
const DEVICE = "00000000-0000-4000-8000-000000000001";

const MEMBER_INPUT = "member-pass-for-test";
const ADMIN_INPUT = "admin-pass-for-test";

/** 本物と同じ形（HMAC の base64url）。生の IP が含まれない */
const hashIpLike = async (ip: string, day: string) =>
  createHmac("sha256", KEY).update(`ip:${day}:${ip}`).digest("base64url");

interface Setup {
  deps: Deps;
  testDb: TestDb;
  matchPassphrase: ReturnType<typeof vi.fn<Deps["matchPassphrase"]>>;
  hashIp: ReturnType<typeof vi.fn<Deps["hashIp"]>>;
}

function setup(overrides: Partial<Deps> = {}, testDb: TestDb = createTestDb()): Setup {
  const matchPassphrase = vi.fn<Deps["matchPassphrase"]>(async (input) => {
    if (input === ADMIN_INPUT) return "admin";
    if (input === MEMBER_INPUT) return "member";
    return null;
  });
  const hashIp = vi.fn<Deps["hashIp"]>(hashIpLike);
  const deps = fakeDeps({ db: testDb.db, matchPassphrase, hashIp, ...overrides });
  return { deps, testDb, matchPassphrase, hashIp };
}

function post(body: unknown, headers: Record<string, string> = { "cf-connecting-ip": IP }): Request {
  return jsonRequest("POST", "/api/session", typeof body === "string" ? body : JSON.stringify(body), headers);
}

async function login(deps: Deps, passphrase: string, ip: string | null = IP): Promise<Response> {
  return handleRequest(post({ passphrase }, ip === null ? {} : { "cf-connecting-ip": ip }), deps);
}

function rows(testDb: TestDb) {
  return testDb.raw.prepare("SELECT key, count, expires_at FROM usage_counters ORDER BY key").all();
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/session 成功", () => {
  it("委員の合言葉で 204、本文なし、Set-Cookie は 1 本", async () => {
    const { deps } = setup();
    const response = await login(deps, MEMBER_INPUT);
    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect(response.headers.getSetCookie()).toHaveLength(1);
  });

  it("Cookie は buildSessionCookie の形で、中身は newId の端末 ID・役割・30 日後の exp", async () => {
    const { deps } = setup();
    const response = await login(deps, MEMBER_INPUT);
    const setCookie = response.headers.get("set-cookie") ?? "";
    const token = setCookie.slice("session=".length, setCookie.indexOf(";"));
    expect(setCookie).toBe(buildSessionCookie(token));
    expect(await verifySessionToken(token, hmacWith(KEY), NOW_SEC)).toStrictEqual({
      device: DEVICE,
      role: "member",
      exp: NOW_SEC + 30 * 86_400,
    });
  });

  it("管理者の合言葉なら役割は admin", async () => {
    const { deps } = setup();
    const response = await login(deps, ADMIN_INPUT);
    const setCookie = response.headers.get("set-cookie") ?? "";
    const token = setCookie.slice("session=".length, setCookie.indexOf(";"));
    expect((await verifySessionToken(token, hmacWith(KEY), NOW_SEC))?.role).toBe("admin");
  });

  it("端末 ID はログインのたびに newId で作る", async () => {
    const newId = vi.fn(() => "11111111-1111-4111-8111-111111111111");
    const { deps } = setup({ newId });
    await login(deps, MEMBER_INPUT);
    await login(deps, MEMBER_INPUT);
    expect(newId).toHaveBeenCalledTimes(2);
  });

  it("合言葉は本文のまま照合に渡す（削らない）", async () => {
    const { deps, matchPassphrase } = setup();
    await login(deps, ` ${MEMBER_INPUT} `);
    expect(matchPassphrase).toHaveBeenCalledWith(` ${MEMBER_INPUT} `);
  });

  it("成功では usage_counters に書かない（3 回失敗の後に成功しても 3 のまま）", async () => {
    const { deps, testDb } = setup();
    expect((await login(deps, MEMBER_INPUT)).status).toBe(204);
    expect(rows(testDb)).toEqual([]);
    for (let i = 0; i < 3; i++) await login(deps, "wrong");
    expect((await login(deps, MEMBER_INPUT)).status).toBe(204);
    expect(rows(testDb)).toEqual([{ key: expect.stringMatching(/^login:/), count: 3, expires_at: EXPIRES_AT }]);
  });

  it("204 にも共通ヘッダ", async () => {
    const { deps } = setup();
    const response = await login(deps, MEMBER_INPUT);
    expect(response.status).toBe(204);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });
});

describe("POST /api/session 不一致", () => {
  it("401 { error: unauthorized }、Set-Cookie なし", async () => {
    const { deps } = setup();
    const response = await login(deps, "wrong");
    expect(response.status).toBe(401);
    expect(await response.json()).toStrictEqual({ error: "unauthorized" });
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("空の合言葉も 401 で、数える", async () => {
    const { deps, testDb } = setup();
    expect((await login(deps, "")).status).toBe(401);
    expect(rows(testDb)).toHaveLength(1);
  });

  it("usage_counters に login:<IPのハッシュ>:<UTC の枠> の 1 行、count 1、expires_at は枠の終わり", async () => {
    const { deps, testDb } = setup();
    await login(deps, "wrong");
    expect(rows(testDb)).toEqual([
      { key: `login:${await hashIpLike(IP, DAY)}:${SLOT}`, count: 1, expires_at: EXPIRES_AT },
    ]);
  });

  it("hashIp には CF-Connecting-IP と UTC の日付を渡す", async () => {
    const { deps, hashIp } = setup();
    await login(deps, "wrong");
    expect(hashIp).toHaveBeenCalledWith(IP, DAY);
  });

  it("D1 に生の IP も合言葉も残らない", async () => {
    const { deps, testDb } = setup();
    await login(deps, "wrong-pass-123");
    expect(rows(testDb)).toHaveLength(1);
    const dump = JSON.stringify(rows(testDb));
    expect(dump).not.toContain(IP);
    expect(dump).not.toContain("wrong-pass-123");
  });

  it("console に何も出さない", async () => {
    const error = vi.spyOn(console, "error");
    const log = vi.spyOn(console, "log");
    const { deps } = setup();
    await login(deps, "wrong");
    expect(error).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
  });
});

describe("POST /api/session 回数の制限", () => {
  it("5 回目の失敗までは 401 で count 5、6 回目の要求は 429", async () => {
    const { deps, testDb } = setup();
    for (let i = 0; i < 5; i++) expect((await login(deps, "wrong")).status).toBe(401);
    expect(rows(testDb)).toEqual([expect.objectContaining({ count: 5 })]);
    const response = await login(deps, "wrong");
    expect(response.status).toBe(429);
    expect(await response.json()).toStrictEqual({ error: "too_many_attempts" });
  });

  it("429 には Retry-After（枠の終わりまでの秒）と共通ヘッダ", async () => {
    const { deps } = setup();
    for (let i = 0; i < 5; i++) await login(deps, "wrong");
    const response = await login(deps, "wrong");
    expect(response.headers.get("retry-after")).toBe("400");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("429 のときは照合せず、数も増やさない", async () => {
    const { deps, testDb, matchPassphrase } = setup();
    for (let i = 0; i < 5; i++) await login(deps, "wrong");
    matchPassphrase.mockClear();
    await login(deps, "wrong");
    await login(deps, "wrong");
    expect(matchPassphrase).not.toHaveBeenCalled();
    expect(rows(testDb)).toEqual([expect.objectContaining({ count: 5 })]);
  });

  it("止まっている間は正しい合言葉でも 429（Cookie を出さない）", async () => {
    const { deps } = setup();
    for (let i = 0; i < 5; i++) await login(deps, "wrong");
    const response = await login(deps, ADMIN_INPUT);
    expect(response.status).toBe(429);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("別の IP は別の枠", async () => {
    const { deps } = setup();
    for (let i = 0; i < 5; i++) await login(deps, "wrong");
    expect((await login(deps, "wrong", "203.0.113.8")).status).toBe(401);
  });

  it("CF-Connecting-IP が無ければ unknown として 1 つの枠を分け合う（X-Forwarded-For は見ない）", async () => {
    const { deps, hashIp } = setup();
    for (let i = 0; i < 5; i++) {
      await handleRequest(post({ passphrase: "wrong" }, { "x-forwarded-for": `198.51.100.${i}` }), deps);
    }
    expect(hashIp).toHaveBeenCalledWith("unknown", DAY);
    expect(hashIp).not.toHaveBeenCalledWith(expect.stringMatching(/^198\./), expect.anything());
    expect((await login(deps, "wrong", null)).status).toBe(429);
  });

  it("10 分たって次の枠になれば、また照合する", async () => {
    const testDb = createTestDb();
    const before = setup({}, testDb);
    for (let i = 0; i < 5; i++) await login(before.deps, "wrong");
    const after = setup({ nowMs: () => NOW_MS + 400_000 }, testDb);
    expect((await login(after.deps, MEMBER_INPUT)).status).toBe(204);
  });

  it("枠の最後の 1 ミリ秒はまだ止まっている", async () => {
    const testDb = createTestDb();
    const before = setup({}, testDb);
    for (let i = 0; i < 5; i++) await login(before.deps, "wrong");
    const edge = setup({ nowMs: () => NOW_MS + 400_000 - 1 }, testDb);
    const response = await login(edge.deps, MEMBER_INPUT);
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("1");
  });

  it("UTC の日付が変わると hashIp の塩が変わる", async () => {
    const { deps, hashIp } = setup({ nowMs: () => Date.parse("2026-10-26T23:59:59.000Z") });
    await login(deps, "wrong");
    const next = setup({ nowMs: () => Date.parse("2026-10-27T00:00:00.000Z") });
    await login(next.deps, "wrong");
    expect(hashIp).toHaveBeenCalledWith(IP, "2026-10-26");
    expect(next.hashIp).toHaveBeenCalledWith(IP, "2026-10-27");
  });
});

describe("POST /api/session 入力の形", () => {
  it.each([
    ["text/plain", "text/plain"],
    ["フォーム", "application/x-www-form-urlencoded"],
  ])("Content-Type が %s なら 415 で、D1 も照合も触らない", async (_name, contentType) => {
    const prepare = vi.fn(() => {
      throw new Error("D1 を触った");
    });
    const { deps, matchPassphrase } = setup({ db: { prepare, batch: prepare } });
    const response = await handleRequest(
      post({ passphrase: MEMBER_INPUT }, { "content-type": contentType, "cf-connecting-ip": IP }),
      deps,
    );
    expect(response.status).toBe(415);
    expect(await response.json()).toStrictEqual({ error: "unsupported_media_type" });
    expect(prepare).not.toHaveBeenCalled();
    expect(matchPassphrase).not.toHaveBeenCalled();
  });

  it("Content-Type が無ければ 415", async () => {
    const { deps } = setup();
    const response = await handleRequest(
      new Request("https://example.test/api/session", {
        method: "POST",
        body: new Uint8Array(new TextEncoder().encode(JSON.stringify({ passphrase: MEMBER_INPUT }))),
      }),
      deps,
    );
    expect(response.status).toBe(415);
  });

  it("content-length が上限を超えると、本文を読まずに 413", async () => {
    const { deps } = setup();
    const req = post({ passphrase: "x" }, { "content-length": "5000", "cf-connecting-ip": IP });
    expect(req.headers.get("content-length")).toBe("5000");
    const text = vi.spyOn(req, "text");
    const response = await handleRequest(req, deps);
    expect(response.status).toBe(413);
    expect(await response.json()).toStrictEqual({ error: "payload_too_large" });
    expect(text).not.toHaveBeenCalled();
  });

  it("本文が 1024 文字を超えると 413", async () => {
    const { deps } = setup();
    expect((await login(deps, "a".repeat(1100))).status).toBe(413);
  });

  it.each([
    ["壊れた JSON", '{"passphrase":'],
    ["配列", '["x"]'],
    ["他のキー", '{"passphrase":"x","role":"admin"}'],
    ["passphrase なし", "{}"],
    ["passphrase が数", '{"passphrase":1}'],
  ])("%s は 400 { error: bad_request } だけで、D1 も照合も触らない", async (_name, body) => {
    const { deps, testDb, matchPassphrase, hashIp } = setup();
    const response = await handleRequest(post(body), deps);
    expect(response.status).toBe(400);
    expect(await response.json()).toStrictEqual({ error: "bad_request" });
    expect(matchPassphrase).not.toHaveBeenCalled();
    expect(hashIp).not.toHaveBeenCalled();
    expect(rows(testDb)).toEqual([]);
  });

  it("D1 が投げたら 500 で中身を漏らさない", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const broken = () => {
      throw new Error("secret-detail");
    };
    const { deps } = setup({ db: { prepare: broken, batch: broken } });
    const response = await login(deps, "wrong");
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("secret-detail");
  });
});

describe("GET /api/session", () => {
  it("Cookie が無ければ 401", async () => {
    const { deps } = setup();
    expect((await handleRequest(request("GET", "/api/session"), deps)).status).toBe(401);
  });

  it.each(["member", "admin"] as const)("%s の Cookie なら 200 { role } だけ（端末 ID は返さない）", async (role) => {
    const { deps } = setup();
    const response = await handleRequest(request("GET", "/api/session", `session=${await sessionToken(role)}`), deps);
    expect(response.status).toBe(200);
    expect(await response.json()).toStrictEqual({ role });
  });

  it("D1 を触らない", async () => {
    const prepare = vi.fn(() => {
      throw new Error("D1 を触った");
    });
    const { deps } = setup({ db: { prepare, batch: prepare } });
    await handleRequest(request("GET", "/api/session", `session=${await sessionToken("member")}`), deps);
    expect(prepare).not.toHaveBeenCalled();
  });
});
