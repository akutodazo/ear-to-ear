import { describe, expect, it } from "vitest";
import { handleRequest } from "./app";
import type { DbPort, Deps } from "./deps";
import { createTestDb, type TestDb } from "./test-db";
import { fakeDeps, request } from "./test-helpers";

const AT = "2026-07-21T01:00:00.000Z";

function insertEvent(testDb: TestDb, overrides: Record<string, string | number | null> = {}): void {
  const row: Record<string, string | number | null> = {
    id: 1,
    field_id: "A-06",
    status: "ready",
    reasons: '["ear_color"]',
    note: null,
    ref_photo_ids: "[]",
    actor_device: "dev-member",
    at: AT,
    revoked_at: null,
    ...overrides,
  };
  const columns = Object.keys(row);
  testDb.raw
    .prepare(`INSERT INTO field_status_events (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`)
    .run(...Object.values(row));
}

const fail = (what: string) => () => {
  throw new Error(`${what} は使わない`);
};

function setup(overrides: Partial<Deps> = {}): { deps: Deps; testDb: TestDb } {
  const testDb = createTestDb();
  const deps = fakeDeps({
    db: testDb.db,
    newId: fail("newId"),
    nowMs: fail("nowMs"),
    hmac: async () => fail("hmac")(),
    ...overrides,
  });
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

interface Event {
  id: number;
  fieldId: string;
  revokedAt: string | null;
}

async function history(deps: Deps, field = "A-06", cookie?: string): Promise<{ response: Response; body: Event[] }> {
  const response = await handleRequest(request("GET", `/api/fields/${field}/status-events`, cookie), deps);
  // history() を使うテストはすべて 200 を前提にする（500 で空の一覧になって偶然通らないように）
  expect(response.status).toBe(200);
  return { response, body: (await response.clone().json()) as Event[] };
}

describe("GET /api/fields/:id/status-events（圃場ページの判断の履歴、T26）", () => {
  it("判断が無ければ 200 で空の配列", async () => {
    const { deps } = setup();
    const { response, body } = await history(deps);
    expect(response.headers.get("content-type")).toMatch(/^application\/json/);
    expect(body).toStrictEqual([]);
  });

  it("各判断は StatusEvent の 9 項目（端末 ID も返す、11-04 先輩決定）", async () => {
    const { deps, testDb } = setup();
    insertEvent(testDb, {
      id: 4,
      status: "done",
      reasons: '["ja_stop_moisture","other"]',
      note: "農協で止められた",
      ref_photo_ids: '["p1","p2"]',
      actor_device: "dev-x",
      at: "2026-07-25T01:00:00.000Z",
      revoked_at: "2026-07-25T02:00:00.000Z",
    });
    const { body } = await history(deps);
    expect(body).toStrictEqual([
      {
        id: 4,
        fieldId: "A-06",
        status: "done",
        reasons: ["ja_stop_moisture", "other"],
        note: "農協で止められた",
        refPhotoIds: ["p1", "p2"],
        actorDevice: "dev-x",
        at: "2026-07-25T01:00:00.000Z",
        revokedAt: "2026-07-25T02:00:00.000Z",
      },
    ]);
  });

  it("AT-1 その圃場の判断だけを、取り消したものも含めて at の新しい順に返す", async () => {
    const { deps, testDb } = setup();
    insertEvent(testDb, { id: 1, at: "2026-07-20T01:00:00.000Z" });
    insertEvent(testDb, { id: 2, at: "2026-07-25T01:00:00.000Z", revoked_at: "2026-07-25T02:00:00.000Z" });
    insertEvent(testDb, { id: 3, at: "2026-07-22T01:00:00.000Z" });
    insertEvent(testDb, { id: 4, field_id: "A-07", at: "2026-07-30T01:00:00.000Z" });
    const { body } = await history(deps);
    expect(body.map((e) => [e.id, e.fieldId, e.revokedAt])).toEqual([
      [2, "A-06", "2026-07-25T02:00:00.000Z"],
      [3, "A-06", null],
      [1, "A-06", null],
    ]);
  });

  it("並びは入れた順・id の順に頼らない（at が古いものほど id が大きい）", async () => {
    const { deps, testDb } = setup();
    insertEvent(testDb, { id: 9, at: "2026-07-20T01:00:00.000Z" });
    insertEvent(testDb, { id: 5, at: "2026-07-24T01:00:00.000Z" });
    insertEvent(testDb, { id: 7, at: "2026-07-22T01:00:00.000Z" });
    insertEvent(testDb, { id: 2, at: "2026-07-26T01:00:00.000Z" });
    const { body } = await history(deps);
    expect(body.map((e) => e.id)).toEqual([2, 5, 7, 9]);
  });

  it("AT-5 at が同じなら id の大きい方が先（入れた順に関わらない）", async () => {
    const { deps, testDb } = setup();
    insertEvent(testDb, { id: 3 });
    insertEvent(testDb, { id: 8 });
    insertEvent(testDb, { id: 5 });
    const { body } = await history(deps);
    expect(body.map((e) => e.id)).toEqual([8, 5, 3]);
  });

  // 攻撃役（T26 の 1 回目）: LIMIT 1000 を決め打ちしても 250 件では通った
  it("件数の上限は付けない（1200 件ならすべて返す、11-04 先輩決定）", async () => {
    const { deps, testDb } = setup();
    for (let i = 1; i <= 1200; i++) {
      insertEvent(testDb, { id: i, at: `2026-07-${String((i % 28) + 1).padStart(2, "0")}T01:00:00.000Z` });
    }
    const { body } = await history(deps);
    expect(body).toHaveLength(1200);
  });

  it("圃場の番号は経路の :id を bind で渡す（ほかの圃場の判断は混ざらない）", async () => {
    const { deps, testDb } = setup();
    insertEvent(testDb, { id: 1, field_id: "A-06" });
    insertEvent(testDb, { id: 2, field_id: "A-11" });
    expect((await history(deps, "A-11")).body.map((e) => e.id)).toEqual([2]);
    expect((await history(deps, "A-06")).body.map((e) => e.id)).toEqual([1]);
    expect((await history(deps, "A-01")).body).toEqual([]);
  });

  // 攻撃役（T26 の 1 回目）: 番号を SQL に文字列で埋め込んでも、一覧の番号が素直なので通った
  it("番号は SQL に埋め込まない（引用符を含む番号でも、その番号の判断だけ）", async () => {
    // 経路のパラメータは復号しないので、URL でそのまま残る文字だけで作る（' は残り、-- から後ろは SQL の注釈）
    const odd = "A-06'--";
    const { deps, testDb } = setup({ knownFieldIds: new Set([odd, "A-06"]) });
    insertEvent(testDb, { id: 1, field_id: "A-06" });
    insertEvent(testDb, { id: 2, field_id: odd });
    expect((await history(deps, odd)).body.map((e) => e.id)).toEqual([2]);
  });

  // 攻撃役（T26 の 2 回目）: 全件を読んで JS で絞り・並べても結果は同じで通った（spec §6・AGENTS.md §4: SQL は 1 文、番号は bind）
  it("SQL は 1 文で、番号は bind で渡し、読むのはその圃場の行だけ", async () => {
    const { testDb } = setup();
    insertEvent(testDb, { id: 1, field_id: "A-06" });
    insertEvent(testDb, { id: 2, field_id: "A-06", at: "2026-07-22T01:00:00.000Z" });
    for (let i = 3; i <= 40; i++) insertEvent(testDb, { id: i, field_id: "A-07" });
    const sqls: string[] = [];
    const binds: unknown[][] = [];
    let rowsRead = 0;
    const db: DbPort = {
      prepare(sql) {
        sqls.push(sql);
        const wrap = (stmt: ReturnType<DbPort["prepare"]>): ReturnType<DbPort["prepare"]> => ({
          bind: (...values: unknown[]) => {
            binds.push(values);
            return wrap(stmt.bind(...values));
          },
          first: async <T>() => {
            const row = await stmt.first<T>();
            if (row !== null) rowsRead += 1;
            return row;
          },
          all: async <T>() => {
            const result = await stmt.all<T>();
            rowsRead += result.results.length;
            return result;
          },
          run: () => stmt.run(),
        });
        return wrap(testDb.db.prepare(sql));
      },
      batch: (statements) => testDb.db.batch(statements),
    };
    const deps = fakeDeps({ db, newId: fail("newId"), nowMs: fail("nowMs"), hmac: async () => fail("hmac")() });
    const { body } = await history(deps);
    expect(body.map((e) => e.id)).toEqual([2, 1]);
    expect(sqls).toHaveLength(1);
    expect(sqls[0]).not.toContain("A-06");
    expect(sqls[0]).not.toContain("*");
    expect(binds).toEqual([["A-06"]]);
    expect(rowsRead).toBe(2);
  });

  it.each([["Z-99"], ["a-06"], ["A-6"], ["summary"]])(
    "AT-3 一覧に無い圃場 %s は 404 { error: not_found } で、D1 を触らない（11-04 先輩決定）",
    async (field) => {
      const { deps } = setup({ db: untouchable });
      const response = await handleRequest(request("GET", `/api/fields/${field}/status-events`), deps);
      expect(response.status).toBe(404);
      expect(await response.json()).toStrictEqual({ error: "not_found" });
    },
  );

  it("圃場は deps.knownFieldIds に従う", async () => {
    const { deps, testDb } = setup({ knownFieldIds: new Set(["B-07"]) });
    insertEvent(testDb, { id: 1, field_id: "B-07" });
    expect((await history(deps, "B-07")).body.map((e) => e.id)).toEqual([1]);
    const response = await handleRequest(request("GET", "/api/fields/A-06/status-events"), deps);
    expect(response.status).toBe(404);
  });

  it("AT-4 認証なし（壊れた Cookie でも 200、hmac を呼ばない）", async () => {
    const { deps, testDb } = setup();
    insertEvent(testDb);
    const { body } = await history(deps, "A-06", "session=broken.token");
    expect(body).toHaveLength(1);
  });

  it.each([
    ["先頭の行の理由が JSON でない", 1, { reasons: "secret-not-json" }],
    ["2 行目以降の理由が配列でない", 3, { reasons: '{"secret":1}' }],
    ["2 行目以降の根拠の要素が文字列でない", 3, { ref_photo_ids: "[1]" }],
    // 攻撃役（T26 の 1 回目）: 理由の要素の型を見なくても通った
    ["2 行目以降の理由の要素が文字列でない", 3, { reasons: "[1]" }],
    ["取り消した行の根拠が JSON でない", 2, { ref_photo_ids: "secret-not-json" }],
  ])("%s なら 500 で、中身を漏らさない", async (_label, brokenId, broken) => {
    const { deps, testDb } = setup();
    // 新しい順に 1・2・3
    insertEvent(testDb, { id: 1, at: "2026-07-25T01:00:00.000Z", ...(brokenId === 1 ? broken : {}) });
    insertEvent(testDb, {
      id: 2,
      at: "2026-07-23T01:00:00.000Z",
      revoked_at: "2026-07-24T00:00:00.000Z",
      ...(brokenId === 2 ? broken : {}),
    });
    insertEvent(testDb, { id: 3, at: "2026-07-21T01:00:00.000Z", ...(brokenId === 3 ? broken : {}) });
    const response = await handleRequest(request("GET", "/api/fields/A-06/status-events"), deps);
    expect(response.status).toBe(500);
    const text = await response.text();
    expect(text).not.toMatch(/secret/);
    expect(JSON.parse(text)).toStrictEqual({ error: "internal" });
  });

  it("ほかの圃場の壊れた行は読まない（200）", async () => {
    const { deps, testDb } = setup();
    insertEvent(testDb, { id: 1, field_id: "A-06" });
    insertEvent(testDb, { id: 2, field_id: "A-07", reasons: "secret-not-json" });
    const { body } = await history(deps);
    expect(body.map((e) => e.id)).toEqual([1]);
  });

  it("D1 が投げたら 500 で中身を漏らさない", async () => {
    const broken = () => {
      throw new Error("secret-detail");
    };
    const { deps } = setup({ db: { prepare: broken, batch: async () => broken() } });
    const response = await handleRequest(request("GET", "/api/fields/A-06/status-events"), deps);
    expect(response.status).toBe(500);
    expect(await response.text()).not.toMatch(/secret/);
  });

  it("D1 を書き換えない", async () => {
    const { deps, testDb } = setup();
    insertEvent(testDb, { id: 1 });
    insertEvent(testDb, { id: 2, revoked_at: "2026-07-22T00:00:00.000Z" });
    const snapshot = () => JSON.stringify(testDb.raw.prepare("SELECT * FROM field_status_events ORDER BY id").all());
    const before = snapshot();
    await history(deps);
    expect(snapshot()).toBe(before);
  });

  it("応答は共通ヘッダの no-store", async () => {
    const { deps } = setup();
    const { response } = await history(deps);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("POST は 405 で Allow: GET", async () => {
    const { deps } = setup({ db: untouchable });
    const response = await handleRequest(request("POST", "/api/fields/A-06/status-events"), deps);
    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET");
  });

  it("R2 を触らない", async () => {
    const { deps, testDb } = setup({
      photos: { put: fail("R2"), get: fail("R2"), delete: fail("R2") } as unknown as Deps["photos"],
    });
    insertEvent(testDb);
    expect((await history(deps)).body).toHaveLength(1);
  });
});
