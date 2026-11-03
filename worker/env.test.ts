import { createHmac, timingSafeEqual as nodeTimingSafeEqual } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createDeps, type Env } from "./env";

// 秘密の名前は文字をつないで作る（AGENTS.md §1-6。値はテスト用）
const MEMBER = "MEMBER_" + "PASSPHRASE";
const ADMIN = "ADMIN_" + "PASSPHRASE";
const SECRET = "SESSION_" + "SECRET";

const MEMBER_VALUE = "member-pass-for-test";
const ADMIN_VALUE = "admin-pass-for-test";
const SECRET_VALUE = "session-key-for-test";

function fakeEnv(overrides: Record<string, string | undefined> = {}): Env {
  return {
    ASSETS: { fetch: async () => new Response("asset") },
    DB: {} as Env["DB"],
    PHOTOS: {} as Env["PHOTOS"],
    [MEMBER]: MEMBER_VALUE,
    [ADMIN]: ADMIN_VALUE,
    [SECRET]: SECRET_VALUE,
    ...overrides,
  } as unknown as Env;
}

function expectedHmac(data: string): Uint8Array {
  return new Uint8Array(createHmac("sha256", Buffer.from(SECRET_VALUE, "utf8")).update(data).digest());
}

// Node の crypto.subtle には Workers の timingSafeEqual が無いので、テストの間だけ足す
const subtle = crypto.subtle as SubtleCrypto & { timingSafeEqual?: unknown };
const timingSafeEqual = vi.fn((a: ArrayBufferView, b: ArrayBufferView) =>
  nodeTimingSafeEqual(
    new Uint8Array(a.buffer, a.byteOffset, a.byteLength),
    new Uint8Array(b.buffer, b.byteOffset, b.byteLength),
  ),
);

beforeAll(() => {
  Object.defineProperty(subtle, "timingSafeEqual", { value: timingSafeEqual, configurable: true });
});

afterAll(() => {
  delete subtle.timingSafeEqual;
});

beforeEach(() => {
  timingSafeEqual.mockClear();
});

describe("matchPassphrase", () => {
  it("管理者の合言葉は admin", async () => {
    expect(await createDeps(fakeEnv()).matchPassphrase(ADMIN_VALUE)).toBe("admin");
  });

  it("委員の合言葉は member", async () => {
    expect(await createDeps(fakeEnv()).matchPassphrase(MEMBER_VALUE)).toBe("member");
  });

  it.each([
    ["違う値", "wrong-pass-for-test!"],
    ["空文字", ""],
    ["委員の合言葉の前だけ", MEMBER_VALUE.slice(0, -1)],
    ["委員の合言葉に1文字足す", `${MEMBER_VALUE}x`],
    ["管理者の合言葉の大文字", ADMIN_VALUE.toUpperCase()],
    ["前後の空白", ` ${MEMBER_VALUE} `],
  ])("%s は null", async (_name, input) => {
    expect(await createDeps(fakeEnv()).matchPassphrase(input)).toBeNull();
  });

  it("照合は timingSafeEqual で行う", async () => {
    await createDeps(fakeEnv()).matchPassphrase(MEMBER_VALUE);
    expect(timingSafeEqual).toHaveBeenCalled();
  });

  it("長さの違う入力でも、同じ長さの値どうしを timingSafeEqual で比べる（長さが時間で漏れない）", async () => {
    await createDeps(fakeEnv()).matchPassphrase("x");
    expect(timingSafeEqual).toHaveBeenCalledTimes(2);
    for (const [a, b] of timingSafeEqual.mock.calls) {
      expect(a.byteLength).toBe(b.byteLength);
    }
  });

  it("どの入力でも admin と member の両方と比べる（どちらに当たったかが時間で漏れない）", async () => {
    const deps = createDeps(fakeEnv());
    for (const input of [ADMIN_VALUE, MEMBER_VALUE, "nope"]) {
      timingSafeEqual.mockClear();
      await deps.matchPassphrase(input);
      expect(timingSafeEqual).toHaveBeenCalledTimes(2);
    }
  });
});

describe("設定の誤り", () => {
  it("委員と管理者の合言葉が同じなら例外（全員が管理者になるのを防ぐ）", () => {
    expect(() => createDeps(fakeEnv({ [ADMIN]: MEMBER_VALUE }))).toThrow(/同じ/);
  });

  it.each([MEMBER, ADMIN, SECRET])("%s が無ければ例外で、名前だけを出す", (name) => {
    expect(() => createDeps(fakeEnv({ [name]: undefined }))).toThrow(new RegExp(name));
  });

  it("空文字も無いのと同じ", () => {
    expect(() => createDeps(fakeEnv({ [SECRET]: "" }))).toThrow(new RegExp(SECRET));
  });

  it("例外の文に秘密の値を出さない", () => {
    try {
      createDeps(fakeEnv({ [ADMIN]: MEMBER_VALUE }));
      expect.unreachable("例外にならなかった");
    } catch (error) {
      const message = (error as Error).message;
      expect(message).not.toContain(MEMBER_VALUE);
      expect(message).not.toContain(SECRET_VALUE);
    }
  });
});

describe("hmac", () => {
  it("SESSION_SECRET の UTF-8 をそのまま鍵にした HMAC-SHA256", async () => {
    const deps = createDeps(fakeEnv());
    expect(await deps.hmac("payload")).toStrictEqual(expectedHmac("payload"));
  });
});

describe("hashIp", () => {
  it('"ip:" + 日付 + ":" + IP の HMAC を base64url にする', async () => {
    const expected = Buffer.from(expectedHmac("ip:2026-11-03:203.0.113.7")).toString("base64url");
    expect(await createDeps(fakeEnv()).hashIp("203.0.113.7", "2026-11-03")).toBe(expected);
  });

  it("IP をそのまま含まず、base64url の 43 文字", async () => {
    const hashed = await createDeps(fakeEnv()).hashIp("203.0.113.7", "2026-11-03");
    expect(hashed).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(hashed).not.toContain("203.0.113.7");
  });

  it("日付と IP のどちらが変わっても値が変わる", async () => {
    const deps = createDeps(fakeEnv());
    const base = await deps.hashIp("203.0.113.7", "2026-11-03");
    expect(await deps.hashIp("203.0.113.7", "2026-11-04")).not.toBe(base);
    expect(await deps.hashIp("203.0.113.8", "2026-11-03")).not.toBe(base);
  });
});

describe("時計と ID", () => {
  it("nowMs はミリ秒", () => {
    vi.spyOn(Date, "now").mockReturnValue(1_793_000_000_123);
    expect(createDeps(fakeEnv()).nowMs()).toBe(1_793_000_000_123);
    vi.restoreAllMocks();
  });

  it("newId は UUID v4", () => {
    expect(createDeps(fakeEnv()).newId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });
});

describe("バインディング", () => {
  it("assets は ASSETS.fetch に渡す", async () => {
    const response = await createDeps(fakeEnv()).assets(new Request("https://example.test/"));
    expect(await response.text()).toBe("asset");
  });
});

describe("knownFieldIds", () => {
  it("src/data/fields.json の番号だけ（A-01〜A-12）", () => {
    const ids = createDeps(fakeEnv()).knownFieldIds;
    expect([...ids].sort()).toEqual(Array.from({ length: 12 }, (_, i) => `A-${String(i + 1).padStart(2, "0")}`));
  });
});
