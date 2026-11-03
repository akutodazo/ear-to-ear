import { describe, expect, it } from "vitest";
import { handleRequest } from "./app";
import type { Deps } from "./deps";
import { createTestDb, type TestDb } from "./test-db";
import { fakeDeps, jsonRequest, NOW_MS, sessionToken } from "./test-helpers";

const NOW_ISO = new Date(NOW_MS).toISOString();
const BEFORE = "2026-11-03T08:00:00.000Z";

interface PhotoRow {
  id: string;
  field_id: string | null;
  chosen_field_id: string | null;
  state: "unconfirmed" | "confirmed";
  candidate_field_ids: string;
  updated_at: string;
}

interface HistoryRow {
  photo_id: string;
  from_field_id: string | null;
  to_field_id: string;
  actor_device: string;
  at: string;
}

function insertPhoto(testDb: TestDb, overrides: Partial<PhotoRow> = {}): void {
  const row = {
    id: "p1",
    field_id: null,
    chosen_field_id: "A-05",
    state: "unconfirmed",
    candidate_field_ids: '["A-06","A-07"]',
    taken_at: "2026-07-21",
    taken_at_source: "xmp",
    content_hash: "ab".repeat(32),
    r2_key: "uploads/p1.jpg",
    width: 1600,
    height: 1200,
    bytes: 1234,
    uploader_device: "dev-member",
    uploaded_at: BEFORE,
    updated_at: BEFORE,
    ...overrides,
  };
  const columns = Object.keys(row);
  testDb.raw
    .prepare(`INSERT INTO uploaded_photos (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`)
    .run(...(Object.values(row) as (string | number | null)[]));
}

function photo(testDb: TestDb, id = "p1"): PhotoRow {
  return testDb.raw
    .prepare("SELECT id, field_id, chosen_field_id, state, candidate_field_ids, updated_at FROM uploaded_photos WHERE id = ?")
    .get(id) as unknown as PhotoRow;
}

function history(testDb: TestDb): HistoryRow[] {
  return testDb.raw
    .prepare("SELECT photo_id, from_field_id, to_field_id, actor_device, at FROM photo_assignments ORDER BY id")
    .all()
    // node:sqlite の行は prototype が null なので、toStrictEqual で比べられるようふつうのオブジェクトに写す
    .map((row) => ({ ...row })) as unknown as HistoryRow[];
}

function setup(): { deps: Deps; testDb: TestDb } {
  const testDb = createTestDb();
  return { deps: fakeDeps({ db: testDb.db }), testDb };
}

async function patch(
  deps: Deps,
  body: string,
  options: { role?: "admin" | "member" | null; id?: string; headers?: Record<string, string> } = {},
): Promise<Response> {
  const role = options.role === undefined ? "admin" : options.role;
  const headers: Record<string, string> = { ...options.headers };
  if (role !== null) headers.cookie = `session=${await sessionToken(role)}`;
  return handleRequest(jsonRequest("PATCH", `/api/photos/${options.id ?? "p1"}/assignment`, body, headers), deps);
}

describe("PATCH /api/photos/:id/assignment（管理者の確定・変更、Issue #78）", () => {
  it("AT-1 未確定を確定: 200 で更新した写真、履歴が1行（前の番号は null）", async () => {
    const { deps, testDb } = setup();
    insertPhoto(testDb);
    const response = await patch(deps, '{"fieldId":"A-07"}');
    expect(response.status).toBe(200);
    expect(await response.json()).toStrictEqual({
      id: "p1",
      fieldId: "A-07",
      chosenFieldId: "A-05",
      state: "confirmed",
      candidateFieldIds: ["A-06", "A-07"],
      takenAt: "2026-07-21",
      takenAtSource: "xmp",
      width: 1600,
      height: 1200,
      uploadedAt: BEFORE,
      uploaderDevice: "dev-member",
    });
    expect(photo(testDb)).toMatchObject({ field_id: "A-07", state: "confirmed", updated_at: NOW_ISO });
    expect(history(testDb)).toStrictEqual([
      { photo_id: "p1", from_field_id: null, to_field_id: "A-07", actor_device: "dev-admin", at: NOW_ISO },
    ]);
  });

  it("AT-2 確定済みを変更: 履歴に前の番号。委員が選んだ番号と候補は変わらない", async () => {
    const { deps, testDb } = setup();
    insertPhoto(testDb, { field_id: "A-03", state: "confirmed" });
    expect((await patch(deps, '{"fieldId":"A-07"}')).status).toBe(200);
    expect(photo(testDb)).toMatchObject({
      field_id: "A-07",
      state: "confirmed",
      chosen_field_id: "A-05",
      candidate_field_ids: '["A-06","A-07"]',
    });
    expect(history(testDb)).toStrictEqual([
      { photo_id: "p1", from_field_id: "A-03", to_field_id: "A-07", actor_device: "dev-admin", at: NOW_ISO },
    ]);
  });

  it("AT-3 確定済みと同じ番号: 200 で何も変えない（履歴も更新時刻も）", async () => {
    const { deps, testDb } = setup();
    insertPhoto(testDb, { field_id: "A-07", state: "confirmed" });
    const response = await patch(deps, '{"fieldId":"A-07"}');
    expect(response.status).toBe(200);
    expect(((await response.json()) as { fieldId: string }).fieldId).toBe("A-07");
    expect(photo(testDb).updated_at).toBe(BEFORE);
    expect(history(testDb)).toStrictEqual([]);
  });

  it("未確定のまま番号が入っている行でも、確定すれば状態が変わり履歴が残る", async () => {
    const { deps, testDb } = setup();
    insertPhoto(testDb, { field_id: "A-07", state: "unconfirmed" });
    expect((await patch(deps, '{"fieldId":"A-07"}')).status).toBe(200);
    expect(photo(testDb).state).toBe("confirmed");
    expect(history(testDb)).toHaveLength(1);
  });

  it("本文に写真のハッシュ・R2 のキー・更新時刻を出さない", async () => {
    const { deps, testDb } = setup();
    insertPhoto(testDb);
    const response = await patch(deps, '{"fieldId":"A-07"}');
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toContain("A-07");
    expect(text).not.toContain("ab".repeat(32));
    expect(text).not.toContain("uploads/");
    expect(text).not.toContain(NOW_ISO);
  });

  it("AT-4 委員の Cookie は 403、合言葉なしは 401。どちらも何も変わらない", async () => {
    const { deps, testDb } = setup();
    insertPhoto(testDb);
    expect((await patch(deps, '{"fieldId":"A-07"}', { role: "member" })).status).toBe(403);
    expect((await patch(deps, '{"fieldId":"A-07"}', { role: null })).status).toBe(401);
    expect(photo(testDb)).toMatchObject({ field_id: null, state: "unconfirmed", updated_at: BEFORE });
    expect(history(testDb)).toStrictEqual([]);
  });

  it("AT-5 無い写真は 404 not_found で、履歴は残らない", async () => {
    const { deps, testDb } = setup();
    insertPhoto(testDb);
    const response = await patch(deps, '{"fieldId":"A-07"}', { id: "no-such" });
    expect(response.status).toBe(404);
    expect(await response.json()).toStrictEqual({ error: "not_found" });
    expect(history(testDb)).toStrictEqual([]);
  });

  it.each([['{"fieldId":"A-99"}'], ['{"fieldId":7}'], ['{"fieldId":""}']])(
    "AT-6 %s は 422 unprocessable で、何も変わらない",
    async (body) => {
      const { deps, testDb } = setup();
      insertPhoto(testDb);
      const response = await patch(deps, body);
      expect(response.status).toBe(422);
      expect(await response.json()).toStrictEqual({ error: "unprocessable" });
      expect(photo(testDb).state).toBe("unconfirmed");
      expect(history(testDb)).toStrictEqual([]);
    },
  );

  it.each([["fieldId=A-07"], ['{"fieldId":"A-07","state":"confirmed"}'], ["{}"], ["[]"]])(
    "AT-7 形の違う本文 %s は 400 bad_request",
    async (body) => {
      const { deps, testDb } = setup();
      insertPhoto(testDb);
      const response = await patch(deps, body);
      expect(response.status).toBe(400);
      expect(await response.json()).toStrictEqual({ error: "bad_request" });
      expect(history(testDb)).toStrictEqual([]);
    },
  );

  it("AT-7 Content-Type が JSON でなければ 415", async () => {
    const { deps, testDb } = setup();
    insertPhoto(testDb);
    const response = await patch(deps, '{"fieldId":"A-07"}', { headers: { "content-type": "text/plain" } });
    expect(response.status).toBe(415);
    expect(history(testDb)).toStrictEqual([]);
  });

  it("AT-7 大きすぎる本文は 413（実際の長さでも、content-length の申告でも）", async () => {
    const { deps, testDb } = setup();
    insertPhoto(testDb);
    const big = `{"fieldId":"A-07","x":"${"a".repeat(1000)}"}`;
    expect((await patch(deps, big)).status).toBe(413);
    expect((await patch(deps, '{"fieldId":"A-07"}', { headers: { "content-length": "100000" } })).status).toBe(413);
    expect(history(testDb)).toStrictEqual([]);
  });

  it("AT-8 同じ要求が同時に2本来ても、履歴は1行", async () => {
    const { deps, testDb } = setup();
    insertPhoto(testDb);
    const responses = await Promise.all([patch(deps, '{"fieldId":"A-07"}'), patch(deps, '{"fieldId":"A-07"}')]);
    expect(responses.map((r) => r.status)).toStrictEqual([200, 200]);
    expect(history(testDb)).toHaveLength(1);
  });

  it("違う番号が同時に2本来ても、履歴の前の番号がつながり、応答はそれぞれ頼んだ番号（PR #79 のレビュー #1・#2）", async () => {
    const { deps, testDb } = setup();
    insertPhoto(testDb);
    const responses = await Promise.all([patch(deps, '{"fieldId":"A-03"}'), patch(deps, '{"fieldId":"A-07"}')]);
    expect(responses.map((r) => r.status)).toStrictEqual([200, 200]);
    const bodies = (await Promise.all(responses.map((r) => r.json()))) as { fieldId: string }[];
    expect(bodies.map((b) => b.fieldId)).toStrictEqual(["A-03", "A-07"]);
    const rows = history(testDb);
    expect(rows).toHaveLength(2);
    // どちらが先でも、後の行の from は先の行の to
    expect(rows[0].from_field_id).toBeNull();
    expect(rows[1].from_field_id).toBe(rows[0].to_field_id);
    expect(photo(testDb).field_id).toBe(rows[1].to_field_id);
  });

  it("確定・変更を続けると、履歴が順に残る", async () => {
    const { deps, testDb } = setup();
    insertPhoto(testDb);
    await patch(deps, '{"fieldId":"A-07"}');
    await patch(deps, '{"fieldId":"A-06"}');
    expect(history(testDb).map((h) => [h.from_field_id, h.to_field_id])).toStrictEqual([
      [null, "A-07"],
      ["A-07", "A-06"],
    ]);
  });
});
