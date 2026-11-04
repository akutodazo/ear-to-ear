import { describe, expect, it } from "vitest";
import { handleRequest } from "./app";
import type { DbPort, Deps } from "./deps";
import { createTestDb, type TestDb } from "./test-db";
import { fakeDeps, request } from "./test-helpers";

const AT = "2026-07-21T01:00:00.000Z";

function insertEvent(testDb: TestDb, overrides: Record<string, string | number | null> = {}): void {
  const row: Record<string, string | number | null> = {
    id: 1,
    field_id: "A-03",
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

let photoSeq = 0;
function insertPhoto(testDb: TestDb, overrides: Record<string, string | number | null> = {}): void {
  photoSeq += 1;
  const id = `p${photoSeq}`;
  const row: Record<string, string | number | null> = {
    id,
    field_id: null,
    chosen_field_id: null,
    state: "unconfirmed",
    candidate_field_ids: "[]",
    taken_at: "2026-07-21",
    taken_at_source: "xmp",
    content_hash: photoSeq.toString(16).padStart(64, "0"),
    r2_key: `uploads/${id}.jpg`,
    width: 1600,
    height: 1200,
    bytes: 1234,
    uploader_device: "dev-member",
    uploaded_at: AT,
    updated_at: AT,
    ...overrides,
  };
  const columns = Object.keys(row);
  testDb.raw
    .prepare(`INSERT INTO uploaded_photos (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`)
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

interface Summary {
  fieldId: string;
  latest: { id: number; fieldId: string; status: string; revokedAt: string | null } | null;
  hasUnconfirmed: boolean;
}

async function summary(deps: Deps, cookie?: string): Promise<{ response: Response; fields: Summary[] }> {
  const response = await handleRequest(request("GET", "/api/fields/summary", cookie), deps);
  // summary() を使うテストはすべて 200 を前提にする（500 で空の一覧になって偶然通らないように）
  expect(response.status).toBe(200);
  const body = (await response.clone().json()) as { fields: Summary[] };
  return { response, fields: body.fields };
}

const byId = (fields: Summary[], id: string): Summary => {
  const found = fields.find((f) => f.fieldId === id);
  if (found === undefined) throw new Error(`${id} が無い`);
  return found;
};

describe("GET /api/fields/summary（地図用のまとめ、T24）", () => {
  it("何も無ければ 200 で、全 12 圃場を一覧の順に latest: null・hasUnconfirmed: false", async () => {
    const { deps } = setup();
    const { response, fields } = await summary(deps);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toMatch(/^application\/json/);
    expect(fields).toStrictEqual(
      [...deps.knownFieldIds].map((fieldId) => ({ fieldId, latest: null, hasUnconfirmed: false })),
    );
    expect(fields).toHaveLength(12);
  });

  it("本文は { fields } だけ", async () => {
    const { deps } = setup();
    const response = await handleRequest(request("GET", "/api/fields/summary"), deps);
    expect(Object.keys(await response.json())).toEqual(["fields"]);
  });

  it("圃場と順は deps.knownFieldIds に従う", async () => {
    const { deps } = setup({ knownFieldIds: new Set(["B-02", "A-09", "C-01"]) });
    const { fields } = await summary(deps);
    expect(fields.map((f) => f.fieldId)).toEqual(["B-02", "A-09", "C-01"]);
  });

  it("latest は有効な最新の判断を 9 項目で返す", async () => {
    const { deps, testDb } = setup();
    insertEvent(testDb, {
      id: 4,
      field_id: "A-03",
      status: "done",
      reasons: '["ja_stop_moisture"]',
      note: "農協で止められた",
      ref_photo_ids: '["p1"]',
      at: "2026-07-25T01:00:00.000Z",
    });
    const { fields } = await summary(deps);
    expect(byId(fields, "A-03").latest).toStrictEqual({
      id: 4,
      fieldId: "A-03",
      status: "done",
      reasons: ["ja_stop_moisture"],
      note: "農協で止められた",
      refPhotoIds: ["p1"],
      actorDevice: "dev-member",
      at: "2026-07-25T01:00:00.000Z",
      revokedAt: null,
    });
  });

  it("同じ圃場に複数あれば at の新しい方。入れた順・id の順に関わらない", async () => {
    const { deps, testDb } = setup();
    insertEvent(testDb, { id: 1, at: "2026-07-25T01:00:00.000Z", status: "done" });
    insertEvent(testDb, { id: 2, at: "2026-07-20T01:00:00.000Z", status: "ready" });
    insertEvent(testDb, { id: 3, at: "2026-07-22T01:00:00.000Z", status: "ready" });
    const { fields } = await summary(deps);
    expect(byId(fields, "A-03").latest?.id).toBe(1);
  });

  it("at が同じなら id の大きい方", async () => {
    const { deps, testDb } = setup();
    insertEvent(testDb, { id: 8, status: "done" });
    insertEvent(testDb, { id: 3, status: "ready" });
    const { fields } = await summary(deps);
    expect(byId(fields, "A-03").latest?.id).toBe(8);
  });

  it("最新を取り消していれば、その前の有効な判断", async () => {
    const { deps, testDb } = setup();
    insertEvent(testDb, { id: 1, at: "2026-07-20T01:00:00.000Z" });
    insertEvent(testDb, { id: 2, at: "2026-07-25T01:00:00.000Z", revoked_at: "2026-07-25T02:00:00.000Z" });
    const { fields } = await summary(deps);
    expect(byId(fields, "A-03").latest?.id).toBe(1);
  });

  it("全部取り消していれば latest: null", async () => {
    const { deps, testDb } = setup();
    insertEvent(testDb, { id: 1, revoked_at: "2026-07-22T00:00:00.000Z" });
    const { fields } = await summary(deps);
    expect(byId(fields, "A-03").latest).toBeNull();
  });

  it("判断は自分の圃場の分だけ。一覧に無い番号の判断は返さない", async () => {
    const { deps, testDb } = setup();
    insertEvent(testDb, { id: 1, field_id: "A-01" });
    insertEvent(testDb, { id: 2, field_id: "A-02", at: "2026-07-30T01:00:00.000Z" });
    insertEvent(testDb, { id: 3, field_id: "Z-99", at: "2026-08-30T01:00:00.000Z" });
    const { fields } = await summary(deps);
    expect(byId(fields, "A-01").latest?.id).toBe(1);
    expect(byId(fields, "A-02").latest?.id).toBe(2);
    expect(fields.some((f) => f.fieldId === "Z-99")).toBe(false);
    expect(fields.filter((f) => f.latest !== null).map((f) => f.fieldId)).toEqual(["A-01", "A-02"]);
  });

  it("未確定の写真の候補（1〜3 位）と委員が選んだ番号に印が付く（本人承認の A）", async () => {
    const { deps, testDb } = setup();
    insertPhoto(testDb, { candidate_field_ids: '["A-01","A-02","A-03"]' });
    insertPhoto(testDb, { candidate_field_ids: '["A-05"]', chosen_field_id: "A-07" });
    const { fields } = await summary(deps);
    expect(fields.filter((f) => f.hasUnconfirmed).map((f) => f.fieldId)).toEqual(["A-01", "A-02", "A-03", "A-05", "A-07"]);
  });

  it("確定済みの写真は印にしない（候補・委員の番号・確定した番号のどれも）", async () => {
    const { deps, testDb } = setup();
    insertPhoto(testDb, {
      state: "confirmed",
      field_id: "A-04",
      candidate_field_ids: '["A-06","A-08"]',
      chosen_field_id: "A-09",
    });
    const { fields } = await summary(deps);
    expect(fields.some((f) => f.hasUnconfirmed)).toBe(false);
  });

  it("判断と写真の印は別々に付く", async () => {
    const { deps, testDb } = setup();
    insertEvent(testDb, { id: 1, field_id: "A-03" });
    insertPhoto(testDb, { candidate_field_ids: '["A-03"]' });
    const { fields } = await summary(deps);
    expect(byId(fields, "A-03")).toMatchObject({ hasUnconfirmed: true, latest: { id: 1 } });
  });

  it("Cookie を読まない（壊れた Cookie でも 200、hmac を呼ばない）", async () => {
    const { deps } = setup();
    const { response } = await summary(deps, "session=broken.token");
    expect(response.status).toBe(200);
  });

  it("判断の理由の列が壊れた行があれば 500 で、中身を漏らさない", async () => {
    const { deps, testDb } = setup();
    insertEvent(testDb, { reasons: "secret-not-json" });
    const response = await handleRequest(request("GET", "/api/fields/summary"), deps);
    expect(response.status).toBe(500);
    const text = await response.text();
    expect(text).not.toMatch(/secret/);
    expect(JSON.parse(text)).toStrictEqual({ error: "internal" });
  });

  // 攻撃役（T24 の 1 回目）: statusEventFromRow を通さず JSON.parse だけで写すと、配列でない値が 200 で素通りした
  it.each([
    ["reasons が null", { reasons: "null" }],
    ["reasons が配列でない", { reasons: '{"secret":1}' }],
    ["reasons の要素が文字列でない", { reasons: "[1]" }],
    ["ref_photo_ids が JSON でない", { ref_photo_ids: "secret-not-json" }],
    ["ref_photo_ids が配列でない", { ref_photo_ids: '"secret"' }],
    ["ref_photo_ids の要素が文字列でない", { ref_photo_ids: "[null]" }],
  ])("有効な判断の %s なら 500 で、中身を漏らさない", async (_label, overrides) => {
    const { deps, testDb } = setup();
    insertEvent(testDb, overrides);
    const response = await handleRequest(request("GET", "/api/fields/summary"), deps);
    expect(response.status).toBe(500);
    expect(await response.text()).not.toMatch(/secret/);
  });

  it("未確定の写真の候補の列が壊れていれば 500 で、中身を漏らさない", async () => {
    const { deps, testDb } = setup();
    insertPhoto(testDb, { candidate_field_ids: "secret-not-json" });
    const response = await handleRequest(request("GET", "/api/fields/summary"), deps);
    expect(response.status).toBe(500);
    expect(await response.text()).not.toMatch(/secret/);
  });

  it("D1 が投げたら 500 で中身を漏らさない", async () => {
    const broken = () => {
      throw new Error("secret-detail");
    };
    const db: DbPort = { prepare: broken, batch: async () => broken() };
    const { deps } = setup({ db });
    const response = await handleRequest(request("GET", "/api/fields/summary"), deps);
    expect(response.status).toBe(500);
    expect(await response.text()).not.toMatch(/secret/);
  });

  it("D1 を書き換えない", async () => {
    const { deps, testDb } = setup();
    insertEvent(testDb, { id: 1 });
    insertPhoto(testDb, { candidate_field_ids: '["A-01"]' });
    const snapshot = () =>
      JSON.stringify([
        testDb.raw.prepare("SELECT * FROM field_status_events ORDER BY id").all(),
        testDb.raw.prepare("SELECT * FROM uploaded_photos ORDER BY id").all(),
        testDb.raw.prepare("SELECT * FROM usage_counters").all(),
      ]);
    const before = snapshot();
    await summary(deps);
    expect(snapshot()).toBe(before);
  });

  it("応答は共通ヘッダの no-store", async () => {
    const { deps } = setup();
    const { response } = await summary(deps);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("POST は 405 で Allow: GET", async () => {
    const { deps } = setup();
    const response = await handleRequest(request("POST", "/api/fields/summary"), deps);
    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET");
  });

  it("R2 を触らない", async () => {
    const { deps, testDb } = setup({
      photos: { put: fail("R2"), get: fail("R2"), delete: fail("R2") } as unknown as Deps["photos"],
    });
    insertPhoto(testDb, { candidate_field_ids: '["A-01"]' });
    const { response } = await summary(deps);
    expect(response.status).toBe(200);
  });
});
