import { afterEach, describe, expect, it, vi } from "vitest";
import { CLAUDE_TIMEOUT_MS } from "@/config";
import { createDeps, type Env } from "./env";

// 秘密の名前は文字をつないで作る（AGENTS.md §1-6。値はテスト用）
const MEMBER = "MEMBER_" + "PASSPHRASE";
const ADMIN = "ADMIN_" + "PASSPHRASE";
const SECRET = "SESSION_" + "SECRET";
const KEY_NAME = "CLAUDE_" + "API_KEY";
const KEY_VALUE = "test-claude-key-not-real";

function fakeEnv(overrides: Record<string, string | undefined> = {}): Env {
  return {
    ASSETS: { fetch: async () => new Response("asset") },
    DB: {} as Env["DB"],
    PHOTOS: {} as Env["PHOTOS"],
    [MEMBER]: "member-pass-for-test",
    [ADMIN]: "admin-pass-for-test",
    [SECRET]: "session-key-for-test",
    ...overrides,
  } as unknown as Env;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Claude の口（T31、人が書く配線）", () => {
  it("キーが無ければ null（呼ばない）", () => {
    expect(createDeps(fakeEnv()).claude).toBeNull();
    expect(createDeps(fakeEnv({ [KEY_NAME]: "" })).claude).toBeNull();
  });

  it("CLAUDE_ENABLED が false なら、キーがあっても null", () => {
    expect(createDeps(fakeEnv({ [KEY_NAME]: KEY_VALUE, CLAUDE_ENABLED: "false" })).claude).toBeNull();
  });

  it("Messages API に POST する（キー・版・JSON の本文・30 秒の打ち切り）", async () => {
    const fetchMock = vi.fn(async () => Response.json({ stop_reason: "end_turn", content: [] }, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const timeout = vi.spyOn(AbortSignal, "timeout");
    const claude = createDeps(fakeEnv({ [KEY_NAME]: KEY_VALUE })).claude;
    expect(claude).not.toBeNull();
    const reply = await claude?.({ model: "m", messages: [] });
    expect(reply).toStrictEqual({ status: 200, body: { stop_reason: "end_turn", content: [] } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    expect(init.method).toBe("POST");
    expect(init.headers).toStrictEqual({
      "content-type": "application/json",
      "x-api-key": KEY_VALUE,
      "anthropic-version": "2026-10-21",
    });
    expect(init.body).toBe(JSON.stringify({ model: "m", messages: [] }));
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(timeout).toHaveBeenCalledWith(CLAUDE_TIMEOUT_MS);
  });

  it("200 以外も状態コードと本文をそのまま返す（判定は Service）", async () => {
    vi.stubGlobal("fetch", async () => Response.json({ type: "error" }, { status: 529 }));
    const claude = createDeps(fakeEnv({ [KEY_NAME]: KEY_VALUE })).claude;
    expect(await claude?.({})).toStrictEqual({ status: 529, body: { type: "error" } });
  });

  it("JSON でない本文は body null", async () => {
    vi.stubGlobal("fetch", async () => new Response("<html>bad gateway</html>", { status: 502 }));
    const claude = createDeps(fakeEnv({ [KEY_NAME]: KEY_VALUE })).claude;
    expect(await claude?.({})).toStrictEqual({ status: 502, body: null });
  });

  it("通信の失敗・時間切れは status 0・body null（例外を出さない、キーを出さない）", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
    });
    const claude = createDeps(fakeEnv({ [KEY_NAME]: KEY_VALUE })).claude;
    const reply = await claude?.({});
    expect(reply).toStrictEqual({ status: 0, body: null });
    expect(JSON.stringify(reply)).not.toContain(KEY_VALUE);
  });

  it("呼ぶたびに 1 回だけ fetch する（再試行しない）", async () => {
    const fetchMock = vi.fn(async () => Response.json({}, { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);
    const claude = createDeps(fakeEnv({ [KEY_NAME]: KEY_VALUE })).claude;
    await claude?.({});
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
