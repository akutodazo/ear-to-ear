import { describe, expect, it, vi } from "vitest";
import { CLAUDE_DAILY_LIMIT, CLAUDE_MODEL } from "@/config";
import { HANDOVER_SYSTEM_PROMPT } from "@/services/handover-prompt";
import { handleRequest } from "./app";
import type { ClaudePort, ClaudeReply, DbPort, Deps } from "./deps";
import { createTestDb, type TestDb } from "./test-db";
import { NOW_MS, fakeDeps, request, sessionToken } from "./test-helpers";

// NOW_MS は日本時間で 2026-10-26（シーズン 2026、回数の key は claude:2026-10-26）
const COUNTER_KEY = "claude:2026-10-26";

function insertEvent(testDb: TestDb, row: Record<string, string | number | null>): void {
  const full: Record<string, string | number | null> = {
    field_id: "A-06",
    status: "ready",
    reasons: '["ear_color"]',
    note: null,
    ref_photo_ids: "[]",
    actor_device: "dev-actor-secret",
    at: "2026-07-21T01:00:00.000Z",
    revoked_at: null,
    ...row,
  };
  const cols = Object.keys(full);
  testDb.raw
    .prepare(`INSERT INTO field_status_events (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`)
    .run(...Object.values(full));
}

function insertPhoto(testDb: TestDb, row: Record<string, string | number | null>): void {
  const full: Record<string, string | number | null> = {
    id: "p-1",
    field_id: "A-06",
    chosen_field_id: null,
    state: "confirmed",
    candidate_field_ids: '["A-06","A-09"]',
    taken_at: "2026-07-20",
    taken_at_source: "xmp",
    content_hash: "a".repeat(64),
    r2_key: "uploads/p-1.jpg",
    width: 1601,
    height: 1203,
    bytes: 1000,
    uploader_device: "dev-uploader-secret",
    uploaded_at: "2026-07-20T03:00:00.000Z",
    updated_at: "2026-07-20T03:00:00.000Z",
    ...row,
  };
  const cols = Object.keys(full);
  testDb.raw
    .prepare(`INSERT INTO uploaded_photos (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`)
    .run(...Object.values(full));
}

/** A-06 に写真 1 枚と判断 2 件（1 件は取り消し）。ほかの圃場にも 1 件ずつ */
function seed(testDb: TestDb): void {
  insertPhoto(testDb, {});
  insertPhoto(testDb, { id: "p-other", field_id: "A-07", content_hash: "b".repeat(64), r2_key: "uploads/p-other.jpg" });
  insertPhoto(testDb, { id: "p-unconf", field_id: null, state: "unconfirmed", content_hash: "c".repeat(64), r2_key: "uploads/p-unconf.jpg" });
  insertEvent(testDb, { id: 3, ref_photo_ids: '["p-1"]', note: "北側はまだ青い" });
  insertEvent(testDb, { id: 4, at: "2026-07-22T01:00:00.000Z", revoked_at: "2026-07-22T05:00:00.000Z" });
  insertEvent(testDb, { id: 9, field_id: "A-07", note: "A-07 の記録" });
}

/** 引用つきの返事（API の形）。要素 1 と 2〜3 を指す */
function apiReply(change: Record<string, unknown> = {}): ClaudeReply {
  return {
    status: 200,
    body: {
      id: "msg_1",
      type: "message",
      role: "assistant",
      model: CLAUDE_MODEL,
      stop_reason: "end_turn",
      content: [
        { type: "text", text: "A-06 は " },
        {
          type: "text",
          text: "7 月 21 日に収穫可能と判断された",
          citations: [
            {
              type: "content_block_location",
              cited_text: "[判断 3] …",
              document_index: 0,
              document_title: "A-06 の 2026 年の記録",
              start_block_index: 1,
              end_block_index: 2,
            },
          ],
        },
        { type: "text", text: "。" },
      ],
      ...change,
    },
  };
}

interface Setup {
  deps: Deps;
  testDb: TestDb;
  claude: ReturnType<typeof vi.fn<ClaudePort>>;
}

function setup(reply: ClaudeReply | (() => Promise<ClaudeReply>) = apiReply(), overrides: Partial<Deps> = {}): Setup {
  const testDb = createTestDb();
  seed(testDb);
  const claude = vi.fn<ClaudePort>(typeof reply === "function" ? reply : async () => reply);
  const deps = fakeDeps({ db: testDb.db, claude, ...overrides });
  return { deps, testDb, claude };
}

async function post(deps: Deps, field = "A-06", role: "admin" | "member" | null = "admin"): Promise<Response> {
  const cookie = role === null ? undefined : `session=${await sessionToken(role)}`;
  return handleRequest(request("POST", `/api/fields/${field}/handover`, cookie), deps);
}

function notes(testDb: TestDb) {
  return testDb.raw.prepare("SELECT field_id, season, body, model, created_at FROM handover_notes ORDER BY field_id, season").all() as {
    field_id: string;
    season: string;
    body: string;
    model: string;
    created_at: string;
  }[];
}

function counter(testDb: TestDb): { key: string; count: number; expires_at: string }[] {
  // node:sqlite の行はプロトタイプの無いオブジェクトなので、ふつうのオブジェクトに写して比べる
  const rows = testDb.raw.prepare("SELECT key, count, expires_at FROM usage_counters WHERE key LIKE 'claude:%'").all() as {
    key: string;
    count: number;
    expires_at: string;
  }[];
  return rows.map((r) => ({ key: r.key, count: r.count, expires_at: r.expires_at }));
}

const EXPECTED_RECORDS = [
  { kind: "photo", id: "p-1", text: "[写真] 2026-07-20 撮影。判断 3 の根拠。" },
  { kind: "status", id: "3", text: "[判断 3] 2026-07-21 収穫可能。理由: 穂の色。メモ: 北側はまだ青い。根拠の写真: 1 枚。" },
  { kind: "status", id: "4", text: "[判断 4] 2026-07-22 収穫可能。理由: 穂の色。（2026-07-22 に取り消し）" },
];

describe("POST /api/fields/:id/handover: 作って保存する（T31）", () => {
  it("記録を要素に並べて Claude を 1 回呼び、写した HandoverNote を 200 で返す", async () => {
    const { deps, claude } = setup();
    const response = await post(deps);
    expect(response.status).toBe(200);
    expect(await response.json()).toStrictEqual({
      fieldId: "A-06",
      season: "2026",
      records: EXPECTED_RECORDS,
      blocks: [
        { text: "A-06 は ", cites: [] },
        { text: "7 月 21 日に収穫可能と判断された", cites: [{ start: 1, end: 2, citedText: "[判断 3] …" }] },
        { text: "。", cites: [] },
      ],
      model: CLAUDE_MODEL,
      createdAt: new Date(NOW_MS).toISOString(),
    });
    expect(claude).toHaveBeenCalledTimes(1);
  });

  it("Claude に送る本文は T30 の要求（要素は取り消しも含むその圃場の記録と確定済みの写真だけ）", async () => {
    const { deps, claude } = setup();
    await post(deps);
    const body = claude.mock.calls[0][0] as {
      model: string;
      system: string;
      messages: { content: { source?: { content: { text: string }[] }; title?: string }[] }[];
    };
    expect(body.model).toBe(CLAUDE_MODEL);
    expect(body.system).toBe(HANDOVER_SYSTEM_PROMPT);
    expect(body.messages[0].content[0].title).toBe("A-06 の 2026 年の記録");
    expect(body.messages[0].content[0].source?.content.map((c) => c.text)).toStrictEqual(EXPECTED_RECORDS.map((r) => r.text));
  });

  it("送る本文に端末 ID・写真の id・候補・大きさ・R2 の鍵・ほかの圃場の記録が入らない", async () => {
    const { deps, claude } = setup();
    await post(deps);
    const sent = JSON.stringify(claude.mock.calls[0][0]);
    for (const secret of ["dev-actor-secret", "dev-uploader-secret", "p-1", "A-09", "1601", "uploads/", "A-07", "p-unconf"]) {
      expect(sent).not.toContain(secret);
    }
  });

  it("handover_notes に 1 行保存し、GET で同じものが返る", async () => {
    const { deps, testDb } = setup();
    const created = await (await post(deps)).json();
    const rows = notes(testDb);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ field_id: "A-06", season: "2026", model: CLAUDE_MODEL, created_at: new Date(NOW_MS).toISOString() });
    expect(JSON.parse(rows[0].body)).toStrictEqual({ records: created.records, blocks: created.blocks });
    const got = await handleRequest(request("GET", "/api/fields/A-06/handover"), deps);
    expect(got.status).toBe(200);
    expect(await got.json()).toStrictEqual(created);
  });

  it("作り直すと同じ圃場・シーズンの行を上書きする（行は増えない）", async () => {
    const { deps, testDb } = setup();
    await post(deps);
    const later = { ...deps, nowMs: () => NOW_MS + 20_000, claude: async () => apiReply({ content: [{ type: "text", text: "新しいメモ" }] }) };
    const response = await post(later);
    expect(response.status).toBe(200);
    const rows = notes(testDb);
    expect(rows).toHaveLength(1);
    expect(JSON.parse(rows[0].body).blocks).toStrictEqual([{ text: "新しいメモ", cites: [] }]);
    expect(rows[0].created_at).toBe(new Date(NOW_MS + 20_000).toISOString());
  });

  it("ほかの圃場・前のシーズンのメモは変えない", async () => {
    const { deps, testDb } = setup();
    testDb.raw
      .prepare("INSERT INTO handover_notes (field_id, season, body, model, created_at) VALUES (?, ?, ?, ?, ?)")
      .run("A-06", "2025", '{"records":[],"blocks":[]}', "old", "2025-11-01T00:00:00.000Z");
    testDb.raw
      .prepare("INSERT INTO handover_notes (field_id, season, body, model, created_at) VALUES (?, ?, ?, ?, ?)")
      .run("A-07", "2026", '{"records":[],"blocks":[]}', "old", "2026-10-01T00:00:00.000Z");
    await post(deps);
    expect(notes(testDb).map((r) => [r.field_id, r.season, r.model])).toStrictEqual([
      ["A-06", "2025", "old"],
      ["A-06", "2026", CLAUDE_MODEL],
      ["A-07", "2026", "old"],
    ]);
  });

  it("回数を 1 つ数える（key は日本時間の日付、期限は翌日の日本時間 0 時）", async () => {
    const { deps, testDb } = setup();
    await post(deps);
    expect(counter(testDb)).toStrictEqual([{ key: COUNTER_KEY, count: 1, expires_at: "2026-10-26T15:00:00.000Z" }]);
    await post(deps);
    expect(counter(testDb)[0].count).toBe(2);
  });
});

describe("POST /api/fields/:id/handover: 止める（T31）", () => {
  it("Cookie なしは 401、委員は 403。Claude を呼ばず、数えず、保存しない", async () => {
    const { deps, claude, testDb } = setup();
    expect((await post(deps, "A-06", null)).status).toBe(401);
    expect((await post(deps, "A-06", "member")).status).toBe(403);
    expect(claude).not.toHaveBeenCalled();
    expect(counter(testDb)).toStrictEqual([]);
    expect(notes(testDb)).toStrictEqual([]);
  });

  it.each(["Z-99", "a-06", "A-13"])("一覧に無い番号 %s は 404 で、D1 も Claude も触らない", async (field) => {
    const untouchable: DbPort = {
      prepare: () => {
        throw new Error("D1 を触った");
      },
      batch: async () => {
        throw new Error("D1 を触った");
      },
    };
    const { deps, claude } = setup(apiReply(), { db: untouchable });
    const response = await post(deps, field);
    expect(response.status).toBe(404);
    expect(await response.json()).toStrictEqual({ error: "not_found" });
    expect(claude).not.toHaveBeenCalled();
  });

  it("Claude の口が無い（CLAUDE_ENABLED=false・キーなし）なら 503 claude_disabled。数えず、保存しない", async () => {
    const testDb = createTestDb();
    seed(testDb);
    const deps = fakeDeps({ db: testDb.db, claude: null });
    const response = await post(deps);
    expect(response.status).toBe(503);
    expect(await response.json()).toStrictEqual({ error: "claude_disabled" });
    expect(counter(testDb)).toStrictEqual([]);
    expect(notes(testDb)).toStrictEqual([]);
  });

  it("記録が 0 件なら 422 no_records。Claude を呼ばず、数えない", async () => {
    const testDb = createTestDb();
    const claude = vi.fn<ClaudePort>(async () => apiReply());
    const deps = fakeDeps({ db: testDb.db, claude });
    insertEvent(testDb, { id: 1, field_id: "A-07" });
    insertEvent(testDb, { id: 2, at: "2025-07-21T01:00:00.000Z" });
    const response = await post(deps);
    expect(response.status).toBe(422);
    expect(await response.json()).toStrictEqual({ error: "unprocessable", reason: "no_records" });
    expect(claude).not.toHaveBeenCalled();
    expect(counter(testDb)).toStrictEqual([]);
  });

  it("その日の回数が上限なら 429（Retry-After は翌日の日本時間 0 時まで）。Claude を呼ばない", async () => {
    const { deps, claude, testDb } = setup();
    testDb.raw
      .prepare("INSERT INTO usage_counters (key, count, expires_at) VALUES (?, ?, ?)")
      .run(COUNTER_KEY, CLAUDE_DAILY_LIMIT, "2026-10-26T15:00:00.000Z");
    const response = await post(deps);
    expect(response.status).toBe(429);
    expect(await response.json()).toStrictEqual({ error: "too_many_requests" });
    expect(response.headers.get("retry-after")).toBe(String(Math.ceil((Date.parse("2026-10-26T15:00:00.000Z") - NOW_MS) / 1000)));
    expect(claude).not.toHaveBeenCalled();
    expect(counter(testDb)[0].count).toBe(CLAUDE_DAILY_LIMIT);
  });

  it("上限の 1 つ手前なら呼べて、ちょうど上限まで数える", async () => {
    const { deps, claude, testDb } = setup();
    testDb.raw
      .prepare("INSERT INTO usage_counters (key, count, expires_at) VALUES (?, ?, ?)")
      .run(COUNTER_KEY, CLAUDE_DAILY_LIMIT - 1, "2026-10-26T15:00:00.000Z");
    expect((await post(deps)).status).toBe(200);
    expect(claude).toHaveBeenCalledTimes(1);
    expect(counter(testDb)[0].count).toBe(CLAUDE_DAILY_LIMIT);
    expect((await post(deps)).status).toBe(429);
  });

  it("前の日の回数は今日に数えない（key が日付ごと）", async () => {
    const { deps, testDb } = setup();
    testDb.raw
      .prepare("INSERT INTO usage_counters (key, count, expires_at) VALUES (?, ?, ?)")
      .run("claude:2026-10-25", CLAUDE_DAILY_LIMIT, "2026-10-25T15:00:00.000Z");
    expect((await post(deps)).status).toBe(200);
  });

  it.each([
    ["200 以外", { status: 529, body: { type: "error" } }, "http"],
    ["通信の失敗・時間切れ", { status: 0, body: null }, "http"],
    ["断られた", apiReply({ stop_reason: "refusal" }), "refusal"],
    ["途中で切れた", apiReply({ stop_reason: "max_tokens" }), "truncated"],
    ["形が違う", { status: 200, body: { stop_reason: "end_turn", content: "x" } }, "shape"],
  ] as [string, ClaudeReply, string][])("%s は 502 bad_gateway（理由つき）。保存しないが、回数は数える", async (_name, reply, reason) => {
    const { deps, testDb } = setup(reply);
    const response = await post(deps);
    expect(response.status).toBe(502);
    expect(await response.json()).toStrictEqual({ error: "bad_gateway", reason });
    expect(notes(testDb)).toStrictEqual([]);
    expect(counter(testDb)[0].count).toBe(1);
  });

  it("Claude の口が例外を投げても 502 http（保存しない）", async () => {
    const { deps, testDb } = setup(async () => {
      throw new Error("network");
    });
    const response = await post(deps);
    expect(response.status).toBe(502);
    expect(await response.json()).toStrictEqual({ error: "bad_gateway", reason: "http" });
    expect(notes(testDb)).toStrictEqual([]);
  });

  it("失敗したとき、前に保存したメモはそのまま残る", async () => {
    const { deps, testDb } = setup();
    await post(deps);
    const before = notes(testDb);
    const failing = { ...deps, claude: async () => apiReply({ stop_reason: "refusal" }) };
    expect((await post(failing)).status).toBe(502);
    expect(notes(testDb)).toStrictEqual(before);
  });

  it("応答に Claude の返事の生の中身（id・usage）を出さない", async () => {
    const { deps } = setup(apiReply({ id: "msg_secret_77", usage: { input_tokens: 123 } }));
    const text = await (await post(deps)).text();
    expect(text).not.toContain("msg_secret_77");
    expect(text).not.toContain("input_tokens");
  });

  it("応答は共通ヘッダの no-store", async () => {
    const { deps } = setup();
    expect((await post(deps)).headers.get("cache-control")).toBe("no-store");
  });
});
