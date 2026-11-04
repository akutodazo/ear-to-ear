import { describe, expect, it } from "vitest";
import { handleRequest } from "./app";
import { STATUS_BODY_MAX_BYTES } from "@/services/status-request";
import type { DbPort, Deps } from "./deps";
import { createTestDb, type TestDb } from "./test-db";
import { fakeDeps, jsonRequest, NOW_MS, repeatChunks, request, sessionToken, streamRequest } from "./test-helpers";

const NOW_ISO = new Date(NOW_MS).toISOString();
const AT = "2026-07-21T01:00:00.000Z";

let photoSeq = 0;
function insertPhoto(testDb: TestDb, id: string, overrides: Record<string, string | number | null> = {}): void {
  photoSeq += 1;
  const row: Record<string, string | number | null> = {
    id,
    field_id: "A-03",
    chosen_field_id: null,
    state: "confirmed",
    candidate_field_ids: '["A-03"]',
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

interface EventRow {
  id: number;
  field_id: string;
  status: string;
  reasons: string;
  note: string | null;
  ref_photo_ids: string;
  actor_device: string;
  at: string;
  revoked_at: string | null;
}

function events(testDb: TestDb): EventRow[] {
  return testDb.raw
    .prepare(
      "SELECT id, field_id, status, reasons, note, ref_photo_ids, actor_device, at, revoked_at FROM field_status_events ORDER BY id",
    )
    .all()
    .map((r) => ({ ...r })) as unknown as EventRow[];
}

const fail = (what: string) => () => {
  throw new Error(`${what} は使わない`);
};

function setup(overrides: Partial<Deps> = {}): { deps: Deps; testDb: TestDb } {
  const testDb = createTestDb();
  return { deps: fakeDeps({ db: testDb.db, newId: fail("newId"), ...overrides }), testDb };
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

async function post(
  deps: Deps,
  body: unknown,
  options: { field?: string; role?: "member" | "admin" | null; headers?: Record<string, string> } = {},
): Promise<Response> {
  const role = options.role === undefined ? "member" : options.role;
  const headers: Record<string, string> = { ...options.headers };
  if (role !== null) headers.cookie = `session=${await sessionToken(role)}`;
  const text = typeof body === "string" ? body : JSON.stringify(body);
  return handleRequest(jsonRequest("POST", `/api/fields/${options.field ?? "A-03"}/status`, text, headers), deps);
}

const READY = { status: "ready", reasons: ["ear_color"], refPhotoIds: [] };

describe("POST /api/fields/:id/status（判断と理由・根拠を残す、T25）", () => {
  it("委員が残すと 201 で、残した判断を返す", async () => {
    const { deps, testDb } = setup();
    insertPhoto(testDb, "p1");
    insertPhoto(testDb, "p2");
    const response = await post(deps, {
      status: "ready",
      reasons: ["ear_color", "ja_stop_moisture"],
      note: "  南側が先に黄色い  ",
      refPhotoIds: ["p2", "p1"],
    });
    expect(response.status).toBe(201);
    expect(response.headers.get("content-type")).toMatch(/^application\/json/);
    expect(await response.json()).toStrictEqual({
      id: 1,
      fieldId: "A-03",
      status: "ready",
      reasons: ["ear_color", "ja_stop_moisture"],
      note: "南側が先に黄色い",
      refPhotoIds: ["p2", "p1"],
      actorDevice: "dev-member",
      at: NOW_ISO,
      revokedAt: null,
    });
  });

  it("表には 1 行増え、理由と根拠は JSON の配列で、時刻は deps.nowMs、端末は Cookie の端末", async () => {
    const later = NOW_MS + 30_000;
    const { deps, testDb } = setup({ nowMs: () => later });
    insertPhoto(testDb, "p1");
    await post(deps, { status: "done", reasons: ["other"], note: "刈った", refPhotoIds: ["p1"] }, { role: "admin" });
    expect(events(testDb)).toStrictEqual([
      {
        id: 1,
        field_id: "A-03",
        status: "done",
        reasons: '["other"]',
        note: "刈った",
        ref_photo_ids: '["p1"]',
        actor_device: "dev-admin",
        at: new Date(later).toISOString(),
        revoked_at: null,
      },
    ]);
  });

  it("理由・根拠・メモが無くても残せる（メモは null、空白だけのメモも null）", async () => {
    const { deps, testDb } = setup();
    expect((await post(deps, { status: "done", reasons: [], refPhotoIds: [] })).status).toBe(201);
    expect((await post(deps, { status: "ready", reasons: [], note: " \n ", refPhotoIds: [] })).status).toBe(201);
    expect(events(testDb).map((e) => [e.reasons, e.note, e.ref_photo_ids])).toEqual([
      ["[]", null, "[]"],
      ["[]", null, "[]"],
    ]);
  });

  it("続けて残すと別の行になり、前の判断は変えない", async () => {
    const { deps, testDb } = setup();
    const first = await (await post(deps, READY)).json();
    const second = await (await post(deps, { ...READY, status: "done" })).json();
    expect([first.id, second.id]).toEqual([1, 2]);
    expect(events(testDb).map((e) => [e.id, e.status, e.revoked_at])).toEqual([
      [1, "ready", null],
      [2, "done", null],
    ]);
  });

  it("圃場は経路の :id（本文には書けない）", async () => {
    const { deps, testDb } = setup();
    expect((await post(deps, READY, { field: "A-11" })).status).toBe(201);
    expect(events(testDb)[0].field_id).toBe("A-11");
  });

  it("残した判断は GET /api/fields/summary の latest になり、DELETE で取り消せる（T23・T24 とつながる）", async () => {
    const { deps } = setup();
    const created = await (await post(deps, READY, { field: "A-05" })).json();
    const summary = async () =>
      ((await (await handleRequest(request("GET", "/api/fields/summary"), deps)).json()) as {
        fields: { fieldId: string; latest: { id: number } | null }[];
      }).fields.find((f) => f.fieldId === "A-05");
    expect((await summary())?.latest?.id).toBe(created.id);
    const cookie = `session=${await sessionToken("member")}`;
    expect((await handleRequest(request("DELETE", `/api/status-events/${created.id}`, cookie), deps)).status).toBe(200);
    expect((await summary())?.latest).toBeNull();
  });

  describe("根拠の写真", () => {
    it("その圃場に確定済みの写真なら通る", async () => {
      const { deps, testDb } = setup();
      insertPhoto(testDb, "p1");
      expect((await post(deps, { ...READY, refPhotoIds: ["p1"] })).status).toBe(201);
    });

    it.each([
      ["別の圃場に確定済み", { field_id: "A-04", candidate_field_ids: '["A-03"]' }],
      ["未確定（候補にはその圃場）", { field_id: null, state: "unconfirmed", candidate_field_ids: '["A-03"]' }],
      ["未確定（委員の番号がその圃場）", { field_id: null, state: "unconfirmed", chosen_field_id: "A-03" }],
    ])("%s の写真は 422 ref_photo_not_in_field で、行を足さない", async (_label, overrides) => {
      const { deps, testDb } = setup();
      insertPhoto(testDb, "p1", overrides);
      const response = await post(deps, { ...READY, refPhotoIds: ["p1"] });
      expect(response.status).toBe(422);
      expect(await response.json()).toStrictEqual({ error: "unprocessable", reason: "ref_photo_not_in_field" });
      expect(events(testDb)).toEqual([]);
    });

    // 攻撃役（T25 の 1 回目）: SQL から state = 'confirmed' を外しても、未確定の写真がどれも field_id: null だったので通った
    it("番号が入っていても未確定の写真は 422 ref_photo_not_in_field", async () => {
      const { deps, testDb } = setup();
      insertPhoto(testDb, "p1", { field_id: "A-03", state: "unconfirmed" });
      const response = await post(deps, { ...READY, refPhotoIds: ["p1"] });
      expect(response.status).toBe(422);
      expect(await response.json()).toStrictEqual({ error: "unprocessable", reason: "ref_photo_not_in_field" });
      expect(events(testDb)).toEqual([]);
    });

    it("重なる根拠は 422 duplicate_ref_photo", async () => {
      const { deps, testDb } = setup();
      insertPhoto(testDb, "p1");
      const response = await post(deps, { ...READY, refPhotoIds: ["p1", "p1"] });
      expect(await response.json()).toStrictEqual({ error: "unprocessable", reason: "duplicate_ref_photo" });
    });

    it("無い写真は 422 ref_photo_not_in_field", async () => {
      const { deps, testDb } = setup();
      insertPhoto(testDb, "p1");
      const response = await post(deps, { ...READY, refPhotoIds: ["p1", "p9"] });
      expect(response.status).toBe(422);
      expect(await response.json()).toStrictEqual({ error: "unprocessable", reason: "ref_photo_not_in_field" });
      expect(events(testDb)).toEqual([]);
    });

    it("根拠の判定は経路の圃場で行う（同じ写真でも、別の圃場への判断には使えない）", async () => {
      const { deps, testDb } = setup();
      insertPhoto(testDb, "p1", { field_id: "A-03" });
      expect((await post(deps, { ...READY, refPhotoIds: ["p1"] }, { field: "A-04" })).status).toBe(422);
      expect((await post(deps, { ...READY, refPhotoIds: ["p1"] }, { field: "A-03" })).status).toBe(201);
    });
  });

  it.each([
    ["status が違う", { ...READY, status: "maybe" }, "bad_status"],
    ["知らない理由", { ...READY, reasons: ["moisture_ok"] }, "unknown_reason"],
    ["重なる理由", { ...READY, reasons: ["other", "other"] }, "duplicate_reason"],
    ["長いメモ", { ...READY, note: "あ".repeat(201) }, "note_too_long"],
    ["根拠が多い", { ...READY, refPhotoIds: ["a", "b", "c", "d", "e", "f"] }, "too_many_ref_photos"],
    ["知らないキー", { ...READY, fieldId: "A-01" }, "unknown_key"],
    ["配列の本文", [], "not_object"],
  ])("%s は 422 で理由 %s、行を足さない", async (_label, body, reason) => {
    const { deps, testDb } = setup();
    const response = await post(deps, body);
    expect(response.status).toBe(422);
    expect(await response.json()).toStrictEqual({ error: "unprocessable", reason });
    expect(events(testDb)).toEqual([]);
  });

  it.each([["Z-99"], ["a-03"], ["A-3"], ["summary"]])(
    "一覧に無い圃場 %s は 422 { error: unprocessable, reason: unknown_field } で、D1 を触らない",
    async (field) => {
      const { deps } = setup({ db: untouchable });
      const response = await post(deps, READY, { field });
      expect(response.status).toBe(422);
      expect(await response.json()).toStrictEqual({ error: "unprocessable", reason: "unknown_field" });
    },
  );

  it("圃場は deps.knownFieldIds に従う", async () => {
    const { deps, testDb } = setup({ knownFieldIds: new Set(["B-07"]) });
    expect((await post(deps, READY, { field: "B-07" })).status).toBe(201);
    expect((await post(deps, READY, { field: "A-03" })).status).toBe(422);
    expect(events(testDb).map((e) => e.field_id)).toEqual(["B-07"]);
  });

  it.each([["空", ""], ["JSON でない", "status=ready"], ["途中で切れた", '{"status":']])(
    "本文が %s なら 400 { error: bad_request } で、行を足さない",
    async (_label, text) => {
      const { deps, testDb } = setup();
      const response = await post(deps, text);
      expect(response.status).toBe(400);
      expect(await response.json()).toStrictEqual({ error: "bad_request" });
      expect(events(testDb)).toEqual([]);
    },
  );

  // 攻撃役（T25 の 1 回目）: Content-Type を完全一致で見ても通った
  it.each([["application/json; charset=utf-8"], ["Application/JSON"], ["application/json ; charset=utf-8"]])("Content-Type %s は受け付ける", async (type) => {
    const { deps } = setup();
    expect((await post(deps, READY, { headers: { "content-type": type } })).status).toBe(201);
  });

  it("多バイトの文字がチャンクの境目で切れても、つないでから読む", async () => {
    const { deps, testDb } = setup();
    const cookie = `session=${await sessionToken("member")}`;
    const bytes = new TextEncoder().encode(JSON.stringify({ ...READY, note: "穂の色🌾が黄色い" }));
    const chunks = Array.from({ length: bytes.length }, (_, i) => bytes.slice(i, i + 1));
    const { req } = streamRequest("/api/fields/A-03/status", chunks, { "content-type": "application/json", cookie });
    const response = await handleRequest(req, deps);
    expect(response.status).toBe(201);
    expect(events(testDb)[0].note).toBe("穂の色🌾が黄色い");
  });

  it.each([["text/plain"], ["text/json"], ["application/x-ndjson"], ["application/jsonx"], ["text/plain; x=application/json"]])(
    "Content-Type %s は 415 で、D1 を触らない",
    async (type) => {
      const { deps } = setup({ db: untouchable });
      const response = await post(deps, READY, { headers: { "content-type": type } });
      expect(response.status).toBe(415);
    },
  );

  it("大きすぎる本文は 413 で、D1 を触らない（実際の長さでも、content-length の申告でも）", async () => {
    const { deps } = setup({ db: untouchable });
    const big = JSON.stringify({ ...READY, note: "a".repeat(3000) });
    expect((await post(deps, big)).status).toBe(413);
    expect((await post(deps, READY, { headers: { "content-length": "100000" } })).status).toBe(413);
  });

  // 攻撃役（T25 の 3 回目）: 上限ちょうどの境目を縛るテストが無かった
  it("本文がちょうど上限（2048 バイト）なら読み、1 バイト超えると 413", async () => {
    const { deps } = setup();
    const base = JSON.stringify({ ...READY, note: "" });
    const exact = JSON.stringify({ ...READY, note: " ".repeat(STATUS_BODY_MAX_BYTES - base.length) });
    const over = JSON.stringify({ ...READY, note: " ".repeat(STATUS_BODY_MAX_BYTES - base.length + 1) });
    expect(new TextEncoder().encode(exact).byteLength).toBe(STATUS_BODY_MAX_BYTES);
    expect((await post(deps, exact)).status).toBe(201);
    expect((await post(deps, over)).status).toBe(413);
  });

  it("Content-Type が無ければ 415", async () => {
    const { deps } = setup({ db: untouchable });
    const cookie = `session=${await sessionToken("member")}`;
    const req = new Request("https://example.test/api/fields/A-03/status", {
      method: "POST",
      headers: { cookie },
      body: new TextEncoder().encode(JSON.stringify(READY)),
    });
    expect((await handleRequest(req, deps)).status).toBe(415);
  });

  it("content-length の無い大きな本文は、上限の近くで読むのをやめて 413", async () => {
    const { deps } = setup({ db: untouchable });
    const cookie = `session=${await sessionToken("member")}`;
    const { req, pulled } = streamRequest("/api/fields/A-03/status", repeatChunks(1_000_000, 512), {
      "content-type": "application/json",
      cookie,
    });
    const response = await handleRequest(req, deps);
    expect(response.status).toBe(413);
    expect(pulled()).toBeLessThan(8192);
  });

  it("メモ 200 字（絵文字）・理由 5 つ・根拠 5 枚の本文は上限に収まり 201", async () => {
    const { deps, testDb } = setup();
    const ids = [1, 2, 3, 4, 5].map((n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`);
    for (const id of ids) insertPhoto(testDb, id);
    const response = await post(deps, {
      status: "ready",
      reasons: ["ear_color", "yellow_ratio", "ja_stop_moisture", "ja_stop_damage", "other"],
      note: "🌾".repeat(200),
      refPhotoIds: ids,
    });
    expect(response.status).toBe(201);
  });

  it("Cookie なしは 401 で、行を足さない", async () => {
    const { deps, testDb } = setup();
    const response = await post(deps, READY, { role: null });
    expect(response.status).toBe(401);
    expect(await response.json()).toStrictEqual({ error: "unauthorized" });
    expect(events(testDb)).toEqual([]);
  });

  it("D1 が投げたら 500 で中身を漏らさない", async () => {
    const broken = () => {
      throw new Error("secret-detail");
    };
    const { deps } = setup({ db: { prepare: broken, batch: async () => broken() } });
    const response = await post(deps, READY);
    expect(response.status).toBe(500);
    expect(await response.text()).not.toMatch(/secret/);
  });

  it("応答は共通ヘッダの no-store", async () => {
    const { deps } = setup();
    const response = await post(deps, READY);
    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("GET は 405 で Allow: POST", async () => {
    const { deps } = setup({ db: untouchable });
    const response = await handleRequest(request("GET", "/api/fields/A-03/status"), deps);
    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("POST");
  });

  it("R2 を触らない", async () => {
    const { deps } = setup({
      photos: { put: fail("R2"), get: fail("R2"), delete: fail("R2") } as unknown as Deps["photos"],
    });
    expect((await post(deps, READY)).status).toBe(201);
  });
});
