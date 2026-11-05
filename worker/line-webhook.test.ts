// #140: POST /api/line/webhook（docs/spec.md §6、L8）。Cookie ではなく LINE の署名で守る
import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { handleRequest } from "./app";
import type { DbPort, Deps, LinePort } from "./deps";
import { LINE_WEBHOOK_MAX_BYTES } from "./line-webhook";
import { createTestDb, type TestDb } from "./test-db";
import { fakeDeps, repeatChunks, streamRequest } from "./test-helpers";

/** テスト用のチャネルの鍵（架空） */
const CHANNEL_KEY = Buffer.alloc(32, 0x02);
const OTHER_KEY = Buffer.alloc(32, 0x03);
const PATH = "/api/line/webhook";

/** 架空のグループ ID（C と 16 進 32 文字） */
const GROUP_A = "C" + "a".repeat(32);
const GROUP_B = "C" + "b".repeat(32);

function signWith(key: Buffer, body: Uint8Array): string {
  return createHmac("sha256", key).update(body).digest("base64");
}

interface Setup {
  deps: Deps;
  testDb: TestDb;
  /** sign が呼ばれた回数 */
  signCalls: () => number;
  /** db.prepare・db.batch が呼ばれた回数 */
  dbCalls: () => number;
}

function setup(line: Partial<LinePort> | null = {}): Setup {
  const testDb = createTestDb();
  let signs = 0;
  let dbs = 0;
  const db: DbPort = {
    prepare: (sql) => {
      dbs++;
      return testDb.db.prepare(sql);
    },
    batch: (statements) => {
      dbs++;
      return testDb.db.batch(statements);
    },
  };
  const port: LinePort | null =
    line === null
      ? null
      : {
          sign: async (body) => {
            signs++;
            return new Uint8Array(createHmac("sha256", CHANNEL_KEY).update(body).digest());
          },
          push: async () => 200,
          ...line,
        };
  return { deps: fakeDeps({ db, line: port }), testDb, signCalls: () => signs, dbCalls: () => dbs };
}

function webhookRequest(body: string, signature: string | null, headers: Record<string, string> = {}): Request {
  const h: Record<string, string> = { "content-type": "application/json", ...headers };
  if (signature !== null) h["x-line-signature"] = signature;
  return new Request(`https://example.test${PATH}`, { method: "POST", headers: h, body });
}

/** 正しい署名を付けた要求 */
function signedRequest(body: string): Request {
  return webhookRequest(body, signWith(CHANNEL_KEY, new TextEncoder().encode(body)));
}

function joinEvent(groupId: string): unknown {
  return { type: "join", timestamp: 1_793_000_000_000, source: { type: "group", groupId }, webhookEventId: "ev-1" };
}

function eventsBody(events: unknown[]): string {
  return JSON.stringify({ destination: "U" + "0".repeat(32), events });
}

function savedGroupId(testDb: TestDb): string | null {
  const row = testDb.raw.prepare("SELECT value FROM settings WHERE key = 'line_group_id'").get() as
    | { value: string }
    | undefined;
  return row?.value ?? null;
}

function settingsCount(testDb: TestDb): number {
  return (testDb.raw.prepare("SELECT COUNT(*) AS n FROM settings").get() as { n: number }).n;
}

describe("POST /api/line/webhook（#140）", () => {
  it("join（group）を受けると settings の line_group_id に保存して 200 { ok: true }", async () => {
    const { deps, testDb } = setup();
    const response = await handleRequest(signedRequest(eventsBody([joinEvent(GROUP_A)])), deps);
    expect(response.status).toBe(200);
    expect(await response.json()).toStrictEqual({ ok: true });
    expect(savedGroupId(testDb)).toBe(GROUP_A);
    expect(settingsCount(testDb)).toBe(1);
  });

  it("2 回目の join は上書きする（行は増えない）", async () => {
    const { deps, testDb } = setup();
    await handleRequest(signedRequest(eventsBody([joinEvent(GROUP_A)])), deps);
    const response = await handleRequest(signedRequest(eventsBody([joinEvent(GROUP_B)])), deps);
    expect(response.status).toBe(200);
    expect(savedGroupId(testDb)).toBe(GROUP_B);
    expect(settingsCount(testDb)).toBe(1);
  });

  it("1 通に join が 2 つあれば最後のものを残す", async () => {
    const { deps, testDb } = setup();
    await handleRequest(signedRequest(eventsBody([joinEvent(GROUP_A), joinEvent(GROUP_B)])), deps);
    expect(savedGroupId(testDb)).toBe(GROUP_B);
  });

  it("ほかの settings の行は変えない", async () => {
    const { deps, testDb } = setup();
    testDb.raw.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run("other_key", "keep");
    await handleRequest(signedRequest(eventsBody([joinEvent(GROUP_A)])), deps);
    expect(testDb.raw.prepare("SELECT value FROM settings WHERE key = 'other_key'").get()).toEqual({ value: "keep" });
  });

  it("LINE の「検証」（events が空）は 200 で何も書かない", async () => {
    const { deps, testDb } = setup();
    const response = await handleRequest(signedRequest(eventsBody([])), deps);
    expect(response.status).toBe(200);
    expect(await response.json()).toStrictEqual({ ok: true });
    expect(settingsCount(testDb)).toBe(0);
  });

  it("ほかのイベント（message・leave・room や user の join）は 200 で書かない。前の値も残す", async () => {
    const { deps, testDb } = setup();
    await handleRequest(signedRequest(eventsBody([joinEvent(GROUP_A)])), deps);
    const response = await handleRequest(
      signedRequest(
        eventsBody([
          { type: "message", source: { type: "group", groupId: GROUP_B }, message: { type: "text", text: "こんにちは" } },
          { type: "leave", source: { type: "group", groupId: GROUP_B } },
          { type: "join", source: { type: "room", roomId: "R" + "c".repeat(32) } },
          { type: "join", source: { type: "user", userId: "U" + "d".repeat(32) } },
        ]),
      ),
      deps,
    );
    expect(response.status).toBe(200);
    expect(savedGroupId(testDb)).toBe(GROUP_A);
  });

  it("署名が正しければ JSON として読めない本文も 200 で書かない", async () => {
    const { deps, testDb } = setup();
    const response = await handleRequest(signedRequest("not json"), deps);
    expect(response.status).toBe(200);
    expect(settingsCount(testDb)).toBe(0);
  });

  it("生の本文で検証する（空白・日本語をそのまま署名した本文が通る）", async () => {
    const { deps, testDb } = setup();
    const body = `{ "events" : [ { "type":"join", "note":"収穫委員会", "source": {"type":"group","groupId":"${GROUP_A}"} } ] }`;
    const response = await handleRequest(signedRequest(body), deps);
    expect(response.status).toBe(200);
    expect(savedGroupId(testDb)).toBe(GROUP_A);
  });

  it("Cookie が無くても通る（auth は none）", async () => {
    const { deps } = setup();
    const response = await handleRequest(signedRequest(eventsBody([])), deps);
    expect(response.status).toBe(200);
  });
});

describe("POST /api/line/webhook 署名が違う・無い（#140）", () => {
  it("署名の見出しが無ければ 401 unauthorized で D1 に触らない", async () => {
    const { deps, testDb, dbCalls } = setup();
    const response = await handleRequest(webhookRequest(eventsBody([joinEvent(GROUP_A)]), null), deps);
    expect(response.status).toBe(401);
    expect(await response.json()).toStrictEqual({ error: "unauthorized" });
    expect(dbCalls()).toBe(0);
    expect(settingsCount(testDb)).toBe(0);
  });

  it("違う鍵の署名は 401 で D1 に触らない", async () => {
    const { deps, dbCalls } = setup();
    const body = eventsBody([joinEvent(GROUP_A)]);
    const response = await handleRequest(webhookRequest(body, signWith(OTHER_KEY, new TextEncoder().encode(body))), deps);
    expect(response.status).toBe(401);
    expect(dbCalls()).toBe(0);
  });

  it("署名の後で本文を変えたら 401（1 文字の違い）", async () => {
    const { deps, dbCalls } = setup();
    const signed = eventsBody([joinEvent(GROUP_A)]);
    const tampered = eventsBody([joinEvent(GROUP_B)]);
    const response = await handleRequest(
      webhookRequest(tampered, signWith(CHANNEL_KEY, new TextEncoder().encode(signed))),
      deps,
    );
    expect(response.status).toBe(401);
    expect(dbCalls()).toBe(0);
  });

  it("形の崩れた署名は 401", async () => {
    const { deps, dbCalls } = setup();
    const response = await handleRequest(webhookRequest(eventsBody([]), "not-a-signature"), deps);
    expect(response.status).toBe(401);
    expect(dbCalls()).toBe(0);
  });

  it("sign が例外を投げたら 401（500 にしない）", async () => {
    const { deps, dbCalls } = setup({
      sign: async () => {
        throw new Error("crypto failed");
      },
    });
    const body = eventsBody([joinEvent(GROUP_A)]);
    const response = await handleRequest(webhookRequest(body, signWith(CHANNEL_KEY, new TextEncoder().encode(body))), deps);
    expect(response.status).toBe(401);
    expect(dbCalls()).toBe(0);
  });
});

describe("POST /api/line/webhook LINE の口が無い・本文が大きい（#140）", () => {
  it("LINE の口が無い（deps.line が null）なら 503 line_disabled で D1 に触らない", async () => {
    const { deps, dbCalls } = setup(null);
    const response = await handleRequest(signedRequest(eventsBody([joinEvent(GROUP_A)])), deps);
    expect(response.status).toBe(503);
    expect(await response.json()).toStrictEqual({ error: "line_disabled" });
    expect(dbCalls()).toBe(0);
  });

  it("上限は 64KB", () => {
    expect(LINE_WEBHOOK_MAX_BYTES).toBe(64 * 1024);
  });

  it("content-length が上限を超えると 413 で、署名を確かめず D1 に触らない", async () => {
    const { deps, signCalls, dbCalls } = setup();
    const body = "x".repeat(LINE_WEBHOOK_MAX_BYTES + 1);
    const response = await handleRequest(
      webhookRequest(body, signWith(CHANNEL_KEY, new TextEncoder().encode(body)), {
        "content-length": String(LINE_WEBHOOK_MAX_BYTES + 1),
      }),
      deps,
    );
    expect(response.status).toBe(413);
    expect(await response.json()).toStrictEqual({ error: "payload_too_large" });
    expect(signCalls()).toBe(0);
    expect(dbCalls()).toBe(0);
  });

  it("content-length の無い本文も上限で読むのをやめて 413", async () => {
    const { deps, signCalls, dbCalls } = setup();
    const { req, pulled } = streamRequest(PATH, repeatChunks(LINE_WEBHOOK_MAX_BYTES * 4, 4096), {
      "x-line-signature": "A".repeat(43) + "=",
    });
    const response = await handleRequest(req, deps);
    expect(response.status).toBe(413);
    expect(pulled()).toBeLessThan(LINE_WEBHOOK_MAX_BYTES * 2);
    expect(signCalls()).toBe(0);
    expect(dbCalls()).toBe(0);
  });

  it("ちょうど上限の本文は読んで検証する", async () => {
    const { deps, testDb } = setup();
    const head = eventsBody([joinEvent(GROUP_A)]);
    const body = head.slice(0, -1) + `,"pad":"${"p".repeat(LINE_WEBHOOK_MAX_BYTES - head.length - 9)}"}`;
    expect(new TextEncoder().encode(body).byteLength).toBe(LINE_WEBHOOK_MAX_BYTES);
    const response = await handleRequest(signedRequest(body), deps);
    expect(response.status).toBe(200);
    expect(savedGroupId(testDb)).toBe(GROUP_A);
  });

  it("push は呼ばない（webhook は保存だけ）", async () => {
    let pushes = 0;
    const { deps } = setup({
      push: async () => {
        pushes++;
        return 200;
      },
    });
    await handleRequest(signedRequest(eventsBody([joinEvent(GROUP_A)])), deps);
    expect(pushes).toBe(0);
  });
});
