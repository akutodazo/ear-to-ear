import { describe, expect, it } from "vitest";
import { handleRequest } from "./app";
import type { DbPort, Deps, StmtPort } from "./deps";
import { createTestDb, type TestDb } from "./test-db";
import { NOW_MS, fakeDeps, request, sessionToken } from "./test-helpers";

// NOW_MS は日本時間で 2026 年
const SEASON = "2026";

const BODY = {
  records: [
    { kind: "photo", id: "p-1", text: "[写真] 2026-07-20 撮影。判断 3 の根拠。" },
    { kind: "status", id: "3", text: "[判断 3] 2026-07-21 収穫可能。理由: 穂の色。" },
  ],
  blocks: [
    { text: "A-06 は ", cites: [] },
    { text: "収穫可能と判断された", cites: [{ start: 1, end: 2, citedText: "[判断 3] …" }] },
  ],
};

function insertNote(testDb: TestDb, fieldId: string, season: string, body: unknown = BODY, model = "claude-sonnet-5-5"): void {
  testDb.raw
    .prepare("INSERT INTO handover_notes (field_id, season, body, model, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(fieldId, season, JSON.stringify(body), model, "2026-11-05T01:00:00.000Z");
}

const fail = (what: string) => () => {
  throw new Error(`${what} は使わない`);
};

function setup(overrides: Partial<Deps> = {}): { deps: Deps; testDb: TestDb } {
  const testDb = createTestDb();
  const deps = fakeDeps({ db: testDb.db, newId: fail("newId"), hmac: async () => fail("hmac")(), ...overrides });
  return { deps, testDb };
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

/** 本物のテスト用 D1 を包み、SQL・bind した値・書き込みの有無を控える */
function spyDb(inner: DbPort): { db: DbPort; sqls: string[]; binds: unknown[][]; writes: number } {
  const log = { sqls: [] as string[], binds: [] as unknown[][], writes: 0 };
  const wrap = (stmt: StmtPort): StmtPort => ({
    bind: (...values) => {
      log.binds.push(values);
      return wrap(stmt.bind(...values));
    },
    first: () => stmt.first(),
    all: () => stmt.all(),
    run: () => {
      log.writes += 1;
      return stmt.run();
    },
  });
  const db: DbPort = {
    prepare: (sql) => {
      log.sqls.push(sql);
      return wrap(inner.prepare(sql));
    },
    batch: async () => {
      log.writes += 1;
      throw new Error("batch は使わない");
    },
  };
  return Object.assign(log, { db });
}

const get = (deps: Deps, field = "A-06", cookie?: string) =>
  handleRequest(request("GET", `/api/fields/${field}/handover`, cookie), deps);

describe("GET /api/fields/:id/handover（引き継ぎメモ、T29）", () => {
  it("今のシーズンのメモを 200 で HandoverNote の形で返す", async () => {
    const { deps, testDb } = setup();
    insertNote(testDb, "A-06", SEASON);
    const response = await get(deps);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toMatch(/^application\/json/);
    expect(await response.json()).toStrictEqual({
      fieldId: "A-06",
      season: SEASON,
      records: BODY.records,
      blocks: BODY.blocks,
      model: "claude-sonnet-5-5",
      createdAt: "2026-11-05T01:00:00.000Z",
    });
  });

  it("他の圃場・他のシーズンのメモは返さない", async () => {
    const { deps, testDb } = setup();
    insertNote(testDb, "A-07", SEASON, { records: [], blocks: [{ text: "A-07 のメモ", cites: [] }] });
    insertNote(testDb, "A-06", "2025", { records: [], blocks: [{ text: "去年のメモ", cites: [] }] });
    insertNote(testDb, "A-06", SEASON);
    const body = (await (await get(deps)).json()) as { fieldId: string; season: string; blocks: { text: string }[] };
    expect([body.fieldId, body.season]).toStrictEqual(["A-06", SEASON]);
    expect(body.blocks.map((b) => b.text)).toStrictEqual(BODY.blocks.map((b) => b.text));
  });

  it("シーズンは deps.nowMs の日本時間の年（年の境）", async () => {
    const { deps, testDb } = setup({ nowMs: () => Date.parse("2025-12-31T15:00:00.000Z") });
    insertNote(testDb, "A-06", "2025", { records: [], blocks: [{ text: "2025", cites: [] }] });
    insertNote(testDb, "A-06", "2026", { records: [], blocks: [{ text: "2026", cites: [] }] });
    const body = (await (await get(deps)).json()) as { season: string };
    expect(body.season).toBe("2026");
  });

  it("今のシーズンのメモが無ければ 404 not_found（前のシーズンがあっても）", async () => {
    const { deps, testDb } = setup();
    insertNote(testDb, "A-06", "2025");
    const response = await get(deps);
    expect(response.status).toBe(404);
    expect(await response.json()).toStrictEqual({ error: "not_found" });
  });

  it.each(["Z-99", "a-06", "A-6", "A-06'--"])("一覧に無い番号 %s は 404 で、D1 を触らない", async (field) => {
    const { deps } = setup({ db: untouchable });
    const response = await get(deps, encodeURIComponent(field));
    expect(response.status).toBe(404);
    expect(await response.json()).toStrictEqual({ error: "not_found" });
  });

  // 攻撃役（T29 の 1 回目）: 一覧を見ずに A-NN の形だけで判定しても通った
  it.each(["A-13", "A-00", "A-99"])("形は合うが一覧に無い番号 %s も 404 で、D1 を触らない", async (field) => {
    const { deps } = setup({ db: untouchable });
    expect((await get(deps, field)).status).toBe(404);
  });

  it("番号の一覧は deps.knownFieldIds に従う（形の違う番号でも、一覧にあれば読む）", async () => {
    const { deps, testDb } = setup({ knownFieldIds: new Set(["B-01"]) });
    insertNote(testDb, "B-01", SEASON, { records: [], blocks: [{ text: "B-01 のメモ", cites: [] }] });
    insertNote(testDb, "A-06", SEASON);
    const response = await get(deps, "B-01");
    expect(response.status).toBe(200);
    expect(((await response.json()) as { fieldId: string }).fieldId).toBe("B-01");
    expect((await get(deps, "A-06")).status).toBe(404);
  });

  it("SQL は 1 文で、番号とシーズンは bind（文字列に埋め込まない）。書き込まない", async () => {
    const testDb = createTestDb();
    insertNote(testDb, "A-06", SEASON);
    const spy = spyDb(testDb.db);
    const response = await get(fakeDeps({ db: spy.db }));
    expect(response.status).toBe(200);
    expect(spy.sqls).toHaveLength(1);
    expect(spy.sqls[0]).not.toContain("A-06");
    expect(spy.sqls[0]).not.toContain(SEASON);
    expect(spy.sqls[0]).not.toContain("*");
    expect(spy.binds).toHaveLength(1);
    expect([...spy.binds[0]].sort()).toStrictEqual([SEASON, "A-06"].sort());
    expect(spy.writes).toBe(0);
  });

  it("認証なし（Cookie なし・壊れた Cookie・管理者でも同じ 200）", async () => {
    const { deps, testDb } = setup();
    insertNote(testDb, "A-06", SEASON);
    expect((await get(deps)).status).toBe(200);
    expect((await get(deps, "A-06", "broken.token")).status).toBe(200);
    expect((await get(deps, "A-06", await sessionToken("admin"))).status).toBe(200);
  });

  it("壊れた行は 500（握りつぶして 404 や空のメモにしない）。中身を応答に出さない", async () => {
    const { deps, testDb } = setup();
    insertNote(testDb, "A-06", SEASON, { records: [{ kind: "memo", id: "dev-secret-77", text: "t" }], blocks: [] });
    const response = await get(deps);
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("dev-secret-77");
  });

  it("引用の番号が records の範囲の外の行も 500", async () => {
    const { deps, testDb } = setup();
    insertNote(testDb, "A-06", SEASON, {
      records: [{ kind: "status", id: "3", text: "t" }],
      blocks: [{ text: "b", cites: [{ start: 0, end: 2, citedText: "c" }] }],
    });
    expect((await get(deps)).status).toBe(500);
  });

  it("応答は共通ヘッダの no-store", async () => {
    const { deps, testDb } = setup();
    insertNote(testDb, "A-06", SEASON);
    expect((await get(deps)).headers.get("cache-control")).toBe("no-store");
  });

  it("POST・DELETE は 405（GET だけ。POST は T30 で足す）", async () => {
    const { deps } = setup();
    const response = await handleRequest(request("DELETE", "/api/fields/A-06/handover"), deps);
    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET");
  });
});

describe("NOW_MS（T29 のテストの前提）", () => {
  it("日本時間で 2026 年", () => {
    expect(new Date(NOW_MS + 9 * 3600_000).toISOString().slice(0, 4)).toBe(SEASON);
  });
});
