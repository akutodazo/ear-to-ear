// L8 の LINE の口と waitUntil（#139、人が書く配線）
import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createDeps, type Env } from "./env";

// 秘密の名前は文字をつないで作る（AGENTS.md §1-6。値はテスト用）
const MEMBER = "MEMBER_" + "PASSPHRASE";
const ADMIN = "ADMIN_" + "PASSPHRASE";
const SECRET = "SESSION_" + "SECRET";
const TOKEN_NAME = "LINE_CHANNEL_" + "ACCESS_TOKEN";
const CHANNEL_SECRET_NAME = "LINE_CHANNEL_" + "SECRET";
const TOKEN_VALUE = "test-line-token-not-real";
const CHANNEL_SECRET_VALUE = "test-line-channel-secret";
const GROUP_ID = "C" + "0123456789abcdef".repeat(2);

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

const both = { [TOKEN_NAME]: TOKEN_VALUE, [CHANNEL_SECRET_NAME]: CHANNEL_SECRET_VALUE };

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("LINE の口（#139）", () => {
  it("秘密が片方でも無ければ null（送らない・webhook も受けない）", () => {
    expect(createDeps(fakeEnv()).line).toBeNull();
    expect(createDeps(fakeEnv({ [TOKEN_NAME]: TOKEN_VALUE })).line).toBeNull();
    expect(createDeps(fakeEnv({ [CHANNEL_SECRET_NAME]: CHANNEL_SECRET_VALUE })).line).toBeNull();
    expect(createDeps(fakeEnv({ ...both, [TOKEN_NAME]: "" })).line).toBeNull();
  });

  it("LINE_ENABLED が false なら、秘密があっても null（大文字小文字・前後の空白は見ない）", () => {
    for (const value of ["false", "FALSE", " False "]) {
      expect(createDeps(fakeEnv({ ...both, LINE_ENABLED: value })).line).toBeNull();
    }
    expect(createDeps(fakeEnv({ ...both, LINE_ENABLED: "true" })).line).not.toBeNull();
    expect(createDeps(fakeEnv(both)).line).not.toBeNull();
  });

  it("sign はチャネルシークレットを鍵にした本文の HMAC-SHA256（生のバイト列）", async () => {
    const line = createDeps(fakeEnv(both)).line;
    const body = new Uint8Array([0x7b, 0xe3, 0x81, 0x82, 0xff, 0x7d]); // UTF-8 として壊れたバイトも含む
    const expected = new Uint8Array(createHmac("sha256", CHANNEL_SECRET_VALUE).update(body).digest());
    expect(await line?.sign(body)).toStrictEqual(expected);
  });

  it("push は Messaging API の push に POST する（トークンは見出しだけ、10 秒の打ち切り）", async () => {
    const fetchMock = vi.fn(async () => Response.json({ sentMessages: [] }, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const timeout = vi.spyOn(AbortSignal, "timeout");
    const line = createDeps(fakeEnv(both)).line;
    expect(await line?.push(GROUP_ID, "A-03 収穫可能")).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.line.me/v2/bot/message/push");
    expect(init.method).toBe("POST");
    expect(init.headers).toStrictEqual({
      "content-type": "application/json",
      authorization: `Bearer ${TOKEN_VALUE}`,
    });
    expect(JSON.parse(String(init.body))).toStrictEqual({
      to: GROUP_ID,
      messages: [{ type: "text", text: "A-03 収穫可能" }],
    });
    expect(String(init.body)).not.toContain(TOKEN_VALUE);
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(timeout).toHaveBeenCalledWith(10_000);
  });

  it("200 以外は状態コードを返す（429 など。判定は呼ぶ側）", async () => {
    vi.stubGlobal("fetch", async () => Response.json({ message: "limit" }, { status: 429 }));
    expect(await createDeps(fakeEnv(both)).line?.push(GROUP_ID, "x")).toBe(429);
  });

  it("通信の失敗・時間切れは 0（例外を出さない）", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
    });
    expect(await createDeps(fakeEnv(both)).line?.push(GROUP_ID, "x")).toBe(0);
  });

  it("呼ぶたびに 1 回だけ fetch する（再試行しない）", async () => {
    const fetchMock = vi.fn(async () => Response.json({}, { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);
    await createDeps(fakeEnv(both)).line?.push(GROUP_ID, "x");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("waitUntil（#139）", () => {
  it("実行の文脈があれば、その waitUntil に渡す", () => {
    const waitUntil = vi.fn();
    const promise = Promise.resolve();
    createDeps(fakeEnv(), { waitUntil }).waitUntil(promise);
    expect(waitUntil).toHaveBeenCalledWith(promise);
  });

  it("文脈が無くても例外を出さず、失敗した約束も外に漏らさない", async () => {
    const deps = createDeps(fakeEnv());
    expect(() => deps.waitUntil(Promise.reject(new Error("送信の失敗")))).not.toThrow();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
});

// #172: L9 LINE から写真を受け取る口（画像の取得と reply）
describe("LINE の口 getContent・reply（#172）", () => {
  function streamOf(chunks: Uint8Array[], pulled: { n: number }): ReadableStream<Uint8Array> {
    let i = 0;
    return new ReadableStream<Uint8Array>(
      {
        pull(controller) {
          if (i >= chunks.length) {
            controller.close();
            return;
          }
          pulled.n += chunks[i].byteLength;
          controller.enqueue(chunks[i]);
          i++;
        },
      },
      // 読まれるまで引かない（作った時点で 1 塊を先に引かない）
      { highWaterMark: 0 },
    );
  }

  it("getContent は api-data の content を GET する（トークンは見出しだけ、10 秒の打ち切り）", async () => {
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
    const fetchMock = vi.fn(async () => new Response(bytes, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const timeout = vi.spyOn(AbortSignal, "timeout");
    const result = await createDeps(fakeEnv(both)).line?.getContent("100001", 1024);
    expect(result).toStrictEqual({ ok: true, bytes });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api-data.line.me/v2/bot/message/100001/content");
    expect(init.method ?? "GET").toBe("GET");
    expect(init.headers).toStrictEqual({ authorization: `Bearer ${TOKEN_VALUE}` });
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(timeout).toHaveBeenCalledWith(10_000);
  });

  it("getContent はちょうど上限なら受け、上限を超えたら読むのをやめて too_large", async () => {
    vi.stubGlobal("fetch", async () => new Response(new Uint8Array(1024), { status: 200 }));
    expect(await createDeps(fakeEnv(both)).line?.getContent("1", 1024)).toStrictEqual({
      ok: true,
      bytes: new Uint8Array(1024),
    });

    const pulled = { n: 0 };
    const chunks = Array.from({ length: 64 }, () => new Uint8Array(256));
    vi.stubGlobal("fetch", async () => new Response(streamOf(chunks, pulled), { status: 200 }));
    expect(await createDeps(fakeEnv(both)).line?.getContent("1", 1024)).toStrictEqual({ ok: false, reason: "too_large" });
    expect(pulled.n).toBeLessThan(256 * 64);
  });

  it("getContent は content-length が上限を超えると読まずに too_large", async () => {
    const pulled = { n: 0 };
    vi.stubGlobal(
      "fetch",
      async () =>
        new Response(streamOf([new Uint8Array(10)], pulled), { status: 200, headers: { "content-length": "4096" } }),
    );
    expect(await createDeps(fakeEnv(both)).line?.getContent("1", 1024)).toStrictEqual({ ok: false, reason: "too_large" });
    expect(pulled.n).toBe(0);
  });

  it("getContent は 200 以外・通信の失敗で failed（例外を出さない）", async () => {
    vi.stubGlobal("fetch", async () => new Response("not found", { status: 404 }));
    expect(await createDeps(fakeEnv(both)).line?.getContent("1", 1024)).toStrictEqual({ ok: false, reason: "failed" });
    vi.stubGlobal("fetch", async () => {
      throw new DOMException("timeout", "TimeoutError");
    });
    expect(await createDeps(fakeEnv(both)).line?.getContent("1", 1024)).toStrictEqual({ ok: false, reason: "failed" });
  });

  it("getContent は数字でない message ID では fetch しない（URL のパスに入れるため）", async () => {
    const fetchMock = vi.fn(async () => new Response(new Uint8Array(1), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    for (const id of ["", "../1", "1/content?x", "abc"]) {
      expect(await createDeps(fakeEnv(both)).line?.getContent(id, 1024)).toStrictEqual({ ok: false, reason: "failed" });
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reply は Messaging API の reply に POST し、状態コードを返す（通信の失敗は 0）", async () => {
    const fetchMock = vi.fn(async () => Response.json({}, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await createDeps(fakeEnv(both)).line?.reply("reply-token-1", "受け取りました")).toBe(200);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.line.me/v2/bot/message/reply");
    expect(init.method).toBe("POST");
    expect(init.headers).toStrictEqual({ "content-type": "application/json", authorization: `Bearer ${TOKEN_VALUE}` });
    expect(JSON.parse(String(init.body))).toStrictEqual({
      replyToken: "reply-token-1",
      messages: [{ type: "text", text: "受け取りました" }],
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    vi.stubGlobal("fetch", async () => {
      throw new Error("down");
    });
    expect(await createDeps(fakeEnv(both)).line?.reply("reply-token-1", "x")).toBe(0);
  });
});
