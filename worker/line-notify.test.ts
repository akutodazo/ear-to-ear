// #141（L8、K15、docs/spec.md §9 の 14）: 判断を残した・取り消したときに LINE に 1 通。
// 送信が失敗しても応答は変わらない。月の送信数は LINE_STOP_AT で止める（1 文で数える）
// URL は判断ごとの OGP ページ（サムネイル付き、#220）。取り消しは ?revoked=1 で別の URL
import { describe, expect, it } from "vitest";
import { LINE_STOP_AT } from "@/config";
import { lineNoticeText } from "@/services/line-notice";
import { lineCounterKey, lineMonthEndsAt } from "@/services/usage-limit";
import type { StatusEvent } from "@/types";
import { handleRequest } from "./app";
import type { DbPort, Deps, LinePort } from "./deps";
import { notifyLine } from "./line-notify";
import { createTestDb, type TestDb } from "./test-db";
import { fakeDeps, jsonRequest, NOW_MS, request, sessionToken } from "./test-helpers";

const NOW_ISO = new Date(NOW_MS).toISOString();
const AT = "2026-07-21T01:00:00.000Z";
const ORIGIN = "https://example.test";
const GROUP = "C-test-group-0001";
const NOTE = "南側が先に黄色い";

const EVENT: StatusEvent = {
  id: 7,
  fieldId: "A-03",
  status: "ready",
  reasons: ["ear_color"],
  note: NOTE,
  refPhotoIds: ["p1"],
  actorDevice: "dev-member",
  at: AT,
  revokedAt: null,
};

interface Pushed {
  groupId: string;
  text: string;
}

/** 送った本文を集める LINE の口。reply で返す状態コード・例外を決める */
function fakeLine(reply: () => Promise<number> = async () => 200): { line: LinePort; pushed: Pushed[] } {
  const pushed: Pushed[] = [];
  const line: LinePort = {
    sign: async () => {
      throw new Error("sign は使わない");
    },
    push: async (groupId, text) => {
      pushed.push({ groupId, text });
      return reply();
    },
    getContent: async () => {
      throw new Error("getContent は使わない");
    },
    reply: async () => {
      throw new Error("reply は使わない（通知は push）");
    },
  };
  return { line, pushed };
}

/** waitUntil に渡された約束を集める。settle で全部を待つ（拒否も待つ） */
function collector(): { waitUntil: Deps["waitUntil"]; promises: Promise<unknown>[]; settle: () => Promise<void> } {
  const promises: Promise<unknown>[] = [];
  return {
    waitUntil: (promise) => {
      promises.push(promise);
    },
    promises,
    settle: async () => {
      await Promise.allSettled(promises);
    },
  };
}

function setGroup(testDb: TestDb, value = GROUP): void {
  testDb.raw.prepare("INSERT INTO settings (key, value) VALUES ('line_group_id', ?)").run(value);
}

function counters(testDb: TestDb): { key: string; count: number; expires_at: string }[] {
  return testDb.raw
    .prepare("SELECT key, count, expires_at FROM usage_counters WHERE key LIKE 'line:%' ORDER BY key")
    .all()
    .map((r) => ({ ...r })) as unknown as { key: string; count: number; expires_at: string }[];
}

function seedCount(testDb: TestDb, count: number): void {
  testDb.raw
    .prepare("INSERT INTO usage_counters (key, count, expires_at) VALUES (?, ?, ?)")
    .run(lineCounterKey(NOW_MS), count, lineMonthEndsAt(NOW_MS));
}

/** D1 を触ったら失敗する DB */
const untouchable: DbPort = {
  prepare: () => {
    throw new Error("D1 を触った");
  },
  batch: async () => {
    throw new Error("D1 を触った");
  },
};

function setup(overrides: Partial<Deps> = {}): { deps: Deps; testDb: TestDb } {
  const testDb = createTestDb();
  return { deps: fakeDeps({ db: testDb.db, ...overrides }), testDb };
}

const recordedText = (event: StatusEvent = EVENT) =>
  lineNoticeText(event, "recorded", `${ORIGIN}/api/judgments/${event.id}`);

describe("notifyLine（判断の後の LINE の 1 通、#141）", () => {
  it("グループ ID があれば、そのグループに本文を 1 通送り、月の回数を 1 にする", async () => {
    const { line, pushed } = fakeLine();
    const { deps, testDb } = setup({ line });
    setGroup(testDb);
    await notifyLine(deps, EVENT, "recorded", ORIGIN);
    expect(pushed).toStrictEqual([{ groupId: GROUP, text: recordedText() }]);
    expect(counters(testDb)).toStrictEqual([
      { key: lineCounterKey(NOW_MS), count: 1, expires_at: lineMonthEndsAt(NOW_MS) },
    ]);
  });

  it("取り消し（revoked）は取り消しの本文で送る", async () => {
    const { line, pushed } = fakeLine();
    const { deps, testDb } = setup({ line });
    setGroup(testDb);
    const revoked = { ...EVENT, revokedAt: NOW_ISO };
    await notifyLine(deps, revoked, "revoked", ORIGIN);
    expect(pushed).toStrictEqual([
      { groupId: GROUP, text: lineNoticeText(revoked, "revoked", `${ORIGIN}/api/judgments/7?revoked=1`) },
    ]);
  });

  it("本文にメモ（note）・端末・根拠の写真が出ない", async () => {
    const { line, pushed } = fakeLine();
    const { deps, testDb } = setup({ line });
    setGroup(testDb);
    await notifyLine(deps, EVENT, "recorded", ORIGIN);
    await notifyLine(deps, { ...EVENT, revokedAt: NOW_ISO }, "revoked", ORIGIN);
    expect(pushed).toHaveLength(2);
    for (const { text } of pushed) {
      expect(text).not.toContain(NOTE);
      expect(text).not.toContain("dev-member");
      expect(text).not.toContain("p1");
    }
  });

  it("LINE の口が無い（null）なら D1 も触らず、何もしない", async () => {
    const deps = fakeDeps({ db: untouchable, line: null });
    await expect(notifyLine(deps, EVENT, "recorded", ORIGIN)).resolves.toBeUndefined();
  });

  it("グループ ID が無ければ送らず、回数も数えない", async () => {
    const { line, pushed } = fakeLine();
    const { deps, testDb } = setup({ line });
    await notifyLine(deps, EVENT, "recorded", ORIGIN);
    expect(pushed).toStrictEqual([]);
    expect(counters(testDb)).toStrictEqual([]);
  });

  it(`月の ${LINE_STOP_AT} 件目までは送り、その次は送らない（回数は ${LINE_STOP_AT} のまま）`, async () => {
    const { line, pushed } = fakeLine();
    const { deps, testDb } = setup({ line });
    setGroup(testDb);
    seedCount(testDb, LINE_STOP_AT - 1);
    await notifyLine(deps, EVENT, "recorded", ORIGIN);
    expect(pushed).toHaveLength(1);
    expect(counters(testDb)[0].count).toBe(LINE_STOP_AT);

    await notifyLine(deps, EVENT, "recorded", ORIGIN);
    expect(pushed).toHaveLength(1);
    expect(counters(testDb)[0].count).toBe(LINE_STOP_AT);
  });

  it("前の月の回数は数えない（日本時間の月ごとの key）", async () => {
    const { line, pushed } = fakeLine();
    const { deps, testDb } = setup({ line });
    setGroup(testDb);
    testDb.raw
      .prepare("INSERT INTO usage_counters (key, count, expires_at) VALUES (?, ?, ?)")
      .run("line:2000-01", LINE_STOP_AT, "2000-01-31T15:00:00.000Z");
    await notifyLine(deps, EVENT, "recorded", ORIGIN);
    expect(pushed).toHaveLength(1);
  });

  it("送信が 0（通信の失敗）や 429 を返しても、再試行しない（1 回だけ）", async () => {
    for (const status of [0, 429, 500]) {
      const { line, pushed } = fakeLine(async () => status);
      const { deps, testDb } = setup({ line });
      setGroup(testDb);
      await expect(notifyLine(deps, EVENT, "recorded", ORIGIN)).resolves.toBeUndefined();
      expect(pushed).toHaveLength(1);
    }
  });

  it("送信が例外を投げても、外に出さない", async () => {
    const { line } = fakeLine(async () => {
      throw new Error("通信の失敗");
    });
    const { deps, testDb } = setup({ line });
    setGroup(testDb);
    await expect(notifyLine(deps, EVENT, "recorded", ORIGIN)).resolves.toBeUndefined();
  });

  it("D1 が例外を投げても、外に出さない（送らない）", async () => {
    const { line, pushed } = fakeLine();
    const deps = fakeDeps({ db: untouchable, line });
    await expect(notifyLine(deps, EVENT, "recorded", ORIGIN)).resolves.toBeUndefined();
    expect(pushed).toStrictEqual([]);
  });
});

async function postStatus(deps: Deps, body: unknown, field = "A-03"): Promise<Response> {
  const cookie = `session=${await sessionToken("member")}`;
  return handleRequest(jsonRequest("POST", `/api/fields/${field}/status`, JSON.stringify(body), { cookie }), deps);
}

async function deleteEvent(deps: Deps, id: string): Promise<Response> {
  return handleRequest(request("DELETE", `/api/status-events/${id}`, `session=${await sessionToken("member")}`), deps);
}

function insertEvent(testDb: TestDb): void {
  testDb.raw
    .prepare(
      "INSERT INTO field_status_events (id, field_id, status, reasons, note, ref_photo_ids, actor_device, at, revoked_at) " +
        "VALUES (1, 'A-03', 'ready', '[\"ear_color\"]', ?, '[]', 'dev-other', ?, NULL)",
    )
    .run(NOTE, AT);
}

const READY = { status: "ready", reasons: ["ear_color"], note: NOTE, refPhotoIds: [] };

describe("POST /api/fields/:id/status の後に LINE に 1 通（#141）", () => {
  it("201 を返し、waitUntil で記録した判断の本文を送る", async () => {
    const { line, pushed } = fakeLine();
    const wait = collector();
    const { deps, testDb } = setup({ line, waitUntil: wait.waitUntil });
    setGroup(testDb);
    const response = await postStatus(deps, READY);
    expect(response.status).toBe(201);
    const body = (await response.json()) as StatusEvent;
    expect(wait.promises).toHaveLength(1);
    await wait.settle();
    expect(pushed).toStrictEqual([{ groupId: GROUP, text: recordedText(body) }]);
    expect(pushed[0].text).not.toContain(NOTE);
  });

  it("送信が例外・0・429 でも、応答は 201 と同じ中身のまま", async () => {
    const replies: (() => Promise<number>)[] = [
      async () => {
        throw new Error("通信の失敗");
      },
      async () => 0,
      async () => 429,
    ];
    for (const reply of replies) {
      const { line } = fakeLine(reply);
      const wait = collector();
      const { deps, testDb } = setup({ line, waitUntil: wait.waitUntil });
      setGroup(testDb);
      const response = await postStatus(deps, READY);
      expect(response.status).toBe(201);
      expect(await response.json()).toStrictEqual({
        id: 1,
        fieldId: "A-03",
        status: "ready",
        reasons: ["ear_color"],
        note: NOTE,
        refPhotoIds: [],
        actorDevice: "dev-member",
        at: NOW_ISO,
        revokedAt: null,
      });
      await wait.settle();
      const results = await Promise.allSettled(wait.promises);
      expect(results.every((r) => r.status === "fulfilled")).toBe(true);
    }
  });

  it("LINE の口が無ければ送らないが、201 は変わらない", async () => {
    const wait = collector();
    const { deps } = setup({ line: null, waitUntil: wait.waitUntil });
    expect((await postStatus(deps, READY)).status).toBe(201);
    await wait.settle();
  });

  it("記録できなかった（422）ときは送らない", async () => {
    const { line, pushed } = fakeLine();
    const wait = collector();
    const { deps, testDb } = setup({ line, waitUntil: wait.waitUntil });
    setGroup(testDb);
    expect((await postStatus(deps, READY, "Z-99")).status).toBe(422);
    await wait.settle();
    expect(pushed).toStrictEqual([]);
  });
});

describe("DELETE /api/status-events/:id の後に LINE に 1 通（#141）", () => {
  it("200 を返し、waitUntil で取り消しの本文を送る", async () => {
    const { line, pushed } = fakeLine();
    const wait = collector();
    const { deps, testDb } = setup({ line, waitUntil: wait.waitUntil });
    setGroup(testDb);
    insertEvent(testDb);
    const response = await deleteEvent(deps, "1");
    expect(response.status).toBe(200);
    const body = (await response.json()) as StatusEvent;
    expect(body.revokedAt).toBe(NOW_ISO);
    expect(wait.promises).toHaveLength(1);
    await wait.settle();
    expect(pushed).toStrictEqual([
      { groupId: GROUP, text: lineNoticeText(body, "revoked", `${ORIGIN}/api/judgments/${body.id}?revoked=1`) },
    ]);
    expect(pushed[0].text).not.toContain(NOTE);
  });

  it("送信が例外を投げても、応答は 200 のまま", async () => {
    const { line } = fakeLine(async () => {
      throw new Error("通信の失敗");
    });
    const wait = collector();
    const { deps, testDb } = setup({ line, waitUntil: wait.waitUntil });
    setGroup(testDb);
    insertEvent(testDb);
    const response = await deleteEvent(deps, "1");
    expect(response.status).toBe(200);
    expect(((await response.json()) as StatusEvent).revokedAt).toBe(NOW_ISO);
    const results = await Promise.allSettled(wait.promises);
    expect(results.every((r) => r.status === "fulfilled")).toBe(true);
  });

  it("取り消せなかった（404）ときは送らない", async () => {
    const { line, pushed } = fakeLine();
    const wait = collector();
    const { deps, testDb } = setup({ line, waitUntil: wait.waitUntil });
    setGroup(testDb);
    expect((await deleteEvent(deps, "1")).status).toBe(404);
    await wait.settle();
    expect(pushed).toStrictEqual([]);
  });

  it(`上限（${LINE_STOP_AT} 件）に届いていたら送らないが、200 は変わらない`, async () => {
    const { line, pushed } = fakeLine();
    const wait = collector();
    const { deps, testDb } = setup({ line, waitUntil: wait.waitUntil });
    setGroup(testDb);
    seedCount(testDb, LINE_STOP_AT);
    insertEvent(testDb);
    expect((await deleteEvent(deps, "1")).status).toBe(200);
    await wait.settle();
    expect(pushed).toStrictEqual([]);
  });
});
