import { describe, expect, it } from "vitest";
import { handleRequest } from "./app";
import type { DbPort, Deps } from "./deps";
import { createTestDb, type TestDb } from "./test-db";
import { fakeDeps, NOW_MS, request, sessionToken } from "./test-helpers";

const NOW_ISO = new Date(NOW_MS).toISOString();
const AT = "2026-07-21T01:00:00.000Z";
const EARLIER_REVOKE = "2026-07-22T00:00:00.000Z";

interface EventRow {
  id: number;
  field_id: string;
  status: "ready" | "done";
  reasons: string;
  note: string | null;
  ref_photo_ids: string;
  actor_device: string;
  at: string;
  revoked_at: string | null;
}

function insertEvent(testDb: TestDb, overrides: Partial<EventRow> = {}): void {
  const event: EventRow = {
    id: 1,
    field_id: "A-03",
    status: "ready",
    reasons: '["ear_color"]',
    note: "南側が先に黄色い",
    ref_photo_ids: '["p1"]',
    actor_device: "dev-other",
    at: AT,
    revoked_at: null,
    ...overrides,
  };
  const columns = Object.keys(event);
  testDb.raw
    .prepare(`INSERT INTO field_status_events (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`)
    .run(...(Object.values(event) as (string | number | null)[]));
}

function events(testDb: TestDb): EventRow[] {
  return testDb.raw
    .prepare(
      "SELECT id, field_id, status, reasons, note, ref_photo_ids, actor_device, at, revoked_at FROM field_status_events ORDER BY id",
    )
    .all()
    .map((r) => ({ ...r })) as unknown as EventRow[];
}

function setup(overrides: Partial<Deps> = {}): { deps: Deps; testDb: TestDb } {
  const testDb = createTestDb();
  const deps = fakeDeps({
    db: testDb.db,
    newId: () => {
      throw new Error("newId は使わない");
    },
    ...overrides,
  });
  return { deps, testDb };
}

async function del(
  deps: Deps,
  id: string,
  role: "member" | "admin" | null = "member",
): Promise<Response> {
  const cookie = role === null ? undefined : `session=${await sessionToken(role)}`;
  return handleRequest(request("DELETE", `/api/status-events/${id}`, cookie), deps);
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

describe("DELETE /api/status-events/:id（判断の取り消し、T23）", () => {
  it("委員が有効な判断を取り消すと 200 で、取り消した判断を返す", async () => {
    const { deps, testDb } = setup();
    insertEvent(testDb);
    const response = await del(deps, "1");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toMatch(/^application\/json/);
    expect(await response.json()).toStrictEqual({
      id: 1,
      fieldId: "A-03",
      status: "ready",
      reasons: ["ear_color"],
      note: "南側が先に黄色い",
      refPhotoIds: ["p1"],
      actorDevice: "dev-other",
      at: AT,
      revokedAt: NOW_ISO,
    });
  });

  it("行は消さず、revoked_at に今の時刻（deps.nowMs）を入れ、ほかの列は変えない", async () => {
    const { deps, testDb } = setup();
    insertEvent(testDb);
    const before = events(testDb)[0];
    await del(deps, "1");
    expect(events(testDb)).toStrictEqual([{ ...before, revoked_at: NOW_ISO }]);
  });

  it("時刻は deps.nowMs に従う（Date を直接読まない）", async () => {
    // Cookie の期限（NOW_SEC + 60）の内側で時計を進める
    const later = NOW_MS + 30_000;
    const { deps, testDb } = setup({ nowMs: () => later });
    insertEvent(testDb);
    const response = await del(deps, "1");
    const expected = new Date(later).toISOString();
    expect((await response.json()).revokedAt).toBe(expected);
    expect(events(testDb)[0].revoked_at).toBe(expected);
  });

  it("管理者も取り消せる", async () => {
    const { deps, testDb } = setup();
    insertEvent(testDb);
    const response = await del(deps, "1", "admin");
    expect(response.status).toBe(200);
    expect(events(testDb)[0].revoked_at).toBe(NOW_ISO);
  });

  it("ほかの判断（同じ圃場・別の圃場）は変えない", async () => {
    const { deps, testDb } = setup();
    insertEvent(testDb, { id: 1 });
    insertEvent(testDb, { id: 2, status: "done" });
    insertEvent(testDb, { id: 3, field_id: "A-04" });
    const response = await del(deps, "2");
    expect(response.status).toBe(200);
    expect((await response.json()).id).toBe(2);
    expect(events(testDb).map((e) => [e.id, e.revoked_at])).toEqual([
      [1, null],
      [2, NOW_ISO],
      [3, null],
    ]);
  });

  it("理由・根拠が空の判断も、そのまま返す", async () => {
    const { deps, testDb } = setup();
    insertEvent(testDb, { reasons: "[]", note: null, ref_photo_ids: "[]", status: "done" });
    const body = await (await del(deps, "1")).json();
    expect(body).toMatchObject({ status: "done", reasons: [], note: null, refPhotoIds: [], revokedAt: NOW_ISO });
  });

  it("Cookie なしは 401 で、行は変わらない", async () => {
    const { deps, testDb } = setup();
    insertEvent(testDb);
    const response = await del(deps, "1", null);
    expect(response.status).toBe(401);
    expect(await response.json()).toStrictEqual({ error: "unauthorized" });
    expect(events(testDb)[0].revoked_at).toBeNull();
  });

  it("壊れた Cookie は 401 で、行は変わらない", async () => {
    const { deps, testDb } = setup();
    insertEvent(testDb);
    const response = await handleRequest(request("DELETE", "/api/status-events/1", "session=broken.token"), deps);
    expect(response.status).toBe(401);
    expect(events(testDb)[0].revoked_at).toBeNull();
  });

  it("無い id は 404 { error: not_found } で、ほかの行は変わらない", async () => {
    const { deps, testDb } = setup();
    insertEvent(testDb);
    const response = await del(deps, "999");
    expect(response.status).toBe(404);
    expect(await response.json()).toStrictEqual({ error: "not_found" });
    expect(events(testDb)[0].revoked_at).toBeNull();
  });

  it("取り消し済みをもう一度取り消すと 404 で、最初の取り消しの時刻を変えない（先輩の決定、11-04）", async () => {
    const { deps, testDb } = setup();
    insertEvent(testDb, { revoked_at: EARLIER_REVOKE });
    const response = await del(deps, "1");
    expect(response.status).toBe(404);
    expect(await response.json()).toStrictEqual({ error: "not_found" });
    expect(events(testDb)[0].revoked_at).toBe(EARLIER_REVOKE);
  });

  it("続けて 2 回取り消すと、1 回目は 200、2 回目は 404 で、時刻は 1 回目のまま", async () => {
    let now = NOW_MS;
    const { deps, testDb } = setup({ nowMs: () => now });
    insertEvent(testDb);
    expect((await del(deps, "1")).status).toBe(200);
    now = NOW_MS + 30_000;
    expect((await del(deps, "1")).status).toBe(404);
    expect(events(testDb)[0].revoked_at).toBe(NOW_ISO);
  });

  it("同時に 2 本来ても、200 は 1 本だけ", async () => {
    const { deps, testDb } = setup();
    insertEvent(testDb);
    const statuses = (await Promise.all([del(deps, "1"), del(deps, "1")])).map((r) => r.status).sort();
    expect(statuses).toEqual([200, 404]);
    expect(events(testDb)[0].revoked_at).toBe(NOW_ISO);
  });

  it.each([
    ["文字", "abc"],
    ["0", "0"],
    ["負", "-1"],
    ["先頭の 0", "01"],
    ["小数", "1.5"],
    ["指数", "1e0"],
    ["安全な整数を超える", "9007199254740993"],
  ])("id が %s（%s）なら 404 で、D1 を触らない", async (_label, id) => {
    const { deps } = setup({ db: untouchable });
    const response = await del(deps, id);
    expect(response.status).toBe(404);
    expect(await response.json()).toStrictEqual({ error: "not_found" });
  });

  it("先頭の 0 の id は、同じ数の判断があっても取り消さない", async () => {
    const { deps, testDb } = setup();
    insertEvent(testDb);
    expect((await del(deps, "01")).status).toBe(404);
    expect(events(testDb)[0].revoked_at).toBeNull();
  });

  it("理由の列が壊れた行は 500 で、中身を漏らさない", async () => {
    const { deps, testDb } = setup();
    insertEvent(testDb, { reasons: "secret-not-json" });
    const response = await del(deps, "1");
    expect(response.status).toBe(500);
    const text = await response.text();
    expect(text).not.toMatch(/secret/);
    expect(JSON.parse(text)).toStrictEqual({ error: "internal" });
  });

  it("D1 が投げたら 500 で中身を漏らさない", async () => {
    const broken = () => {
      throw new Error("secret-detail");
    };
    const { deps } = setup({ db: { prepare: broken, batch: async () => broken() } });
    const response = await del(deps, "1");
    expect(response.status).toBe(500);
    expect(await response.text()).not.toMatch(/secret/);
  });

  it("本文を付けて送っても無視して取り消す", async () => {
    const { deps, testDb } = setup();
    insertEvent(testDb);
    const cookie = `session=${await sessionToken("member")}`;
    const response = await handleRequest(
      new Request("https://example.test/api/status-events/1", {
        method: "DELETE",
        headers: { cookie, "content-type": "application/json" },
        body: '{"id":2}',
      }),
      deps,
    );
    expect(response.status).toBe(200);
    expect(events(testDb)[0].revoked_at).toBe(NOW_ISO);
  });

  it("応答は共通ヘッダの no-store", async () => {
    const { deps, testDb } = setup();
    insertEvent(testDb);
    const response = await del(deps, "1");
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("GET は 405 で Allow: DELETE", async () => {
    const { deps } = setup({ db: untouchable });
    const response = await handleRequest(request("GET", "/api/status-events/1"), deps);
    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("DELETE");
  });

  it("R2 を触らない", async () => {
    const { deps, testDb } = setup({
      photos: {
        put: async () => {
          throw new Error("R2 を触った");
        },
        get: async () => {
          throw new Error("R2 を触った");
        },
        delete: async () => {
          throw new Error("R2 を触った");
        },
      },
    });
    insertEvent(testDb);
    expect((await del(deps, "1")).status).toBe(200);
  });
});
