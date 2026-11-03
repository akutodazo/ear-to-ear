/**
 * GET /api/photos?fieldId=（T22、docs/run/TASKS.md）。圃場ごとの確定済みの写真。認証なし。
 * 行の入れ方と D1 の見張りは photos.test.ts（T21）と同じ形。
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { RECENT_LIMIT_MAX } from "@/config";
import { handleRequest } from "./app";
import type { DbPort, Deps } from "./deps";
import { createTestBucket } from "./test-bucket";
import { createTestDb, type TestDb } from "./test-db";
import { fakeDeps, request } from "./test-helpers";

const HASH = "ef".repeat(32);

interface Row {
  id: string;
  field_id: string | null;
  chosen_field_id: string | null;
  state: "unconfirmed" | "confirmed";
  candidate_field_ids: string;
  taken_at: string | null;
  taken_at_source: "xmp" | "exif" | "none";
  content_hash: string;
  r2_key: string;
  width: number;
  height: number;
  bytes: number;
  uploader_device: string;
  uploaded_at: string;
  updated_at: string;
}

let serial = 0;

/** 既定は「A-03 に確定済み・撮影日あり」の 1 枚 */
function insert(testDb: TestDb, overrides: Partial<Row> = {}): Row {
  serial += 1;
  const id = overrides.id ?? `q${String(serial).padStart(5, "0")}`;
  const row: Row = {
    id,
    field_id: "A-03",
    chosen_field_id: null,
    state: "confirmed",
    candidate_field_ids: '["A-03"]',
    taken_at: "2026-07-24",
    taken_at_source: "exif",
    content_hash: `${id}-${HASH}`.slice(0, 64).padEnd(64, "0"),
    r2_key: `uploads/${id}.jpg`,
    width: 1600,
    height: 1200,
    bytes: 1234,
    uploader_device: "dev-1",
    uploaded_at: "2026-11-03T08:00:00.000Z",
    updated_at: "2026-11-03T08:00:00.000Z",
    ...overrides,
  };
  const columns = Object.keys(row);
  testDb.raw
    .prepare(`INSERT INTO uploaded_photos (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`)
    .run(...(Object.values(row) as (string | number | null)[]));
  return row;
}

function setup(overrides: Partial<Deps> = {}) {
  const testDb = createTestDb();
  const binds: unknown[][] = [];
  const sqls: string[] = [];
  const prepare = vi.fn<DbPort["prepare"]>((sql) => {
    sqls.push(sql);
    const stmt = testDb.db.prepare(sql);
    const bind = stmt.bind;
    stmt.bind = (...values: unknown[]) => {
      binds.push(values);
      return bind(...values);
    };
    return stmt;
  });
  const deps = fakeDeps({ db: { prepare, batch: (s) => testDb.db.batch(s) }, ...overrides });
  return { deps, testDb, prepare, sqls, binds };
}

async function byField(deps: Deps, query: string, cookie?: string): Promise<Response> {
  return handleRequest(request("GET", `/api/photos${query}`, cookie), deps);
}

async function ids(response: Response): Promise<string[]> {
  expect(response.status).toBe(200);
  return ((await response.json()) as { id: string }[]).map((p) => p.id);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/photos?fieldId= の 400", () => {
  it.each([
    ["番号が無い", ""],
    ["空", "?fieldId="],
    ["一覧に無い番号", "?fieldId=A-13"],
    ["小文字", "?fieldId=a-03"],
    ["後ろに空白", "?fieldId=A-03%20"],
    ["別の名前のクエリだけ", "?field=A-03"],
    ["SQL らしい文字", "?fieldId=A-03'%20OR%20'1'%3D'1"],
  ])("%s なら 400 { error: bad_request } で、D1 を触らない", async (_label, query) => {
    const { deps, testDb, prepare } = setup();
    insert(testDb);
    const response = await byField(deps, query);
    expect(response.status).toBe(400);
    expect(await response.json()).toStrictEqual({ error: "bad_request" });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(prepare).not.toHaveBeenCalled();
  });
});

describe("GET /api/photos?fieldId= の 200", () => {
  it("写真が無ければ 200 [] で、JSON と共通ヘッダ（no-store）", async () => {
    const { deps } = setup();
    const response = await byField(deps, "?fieldId=A-03");
    expect(response.status).toBe(200);
    expect(await response.json()).toStrictEqual([]);
    expect(response.headers.get("content-type")).toBe("application/json; charset=utf-8");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("1 枚なら UploadedPhoto の 11 項目ちょうど", async () => {
    const { deps, testDb } = setup();
    insert(testDb, {
      id: "p1",
      field_id: "A-03",
      chosen_field_id: "A-05",
      candidate_field_ids: '["A-03","A-05"]',
      taken_at: "2026-07-20",
      taken_at_source: "xmp",
      uploader_device: "dev-9",
      uploaded_at: "2026-11-03T08:34:23.249Z",
    });
    expect(await (await byField(deps, "?fieldId=A-03")).json()).toStrictEqual([
      {
        id: "p1",
        fieldId: "A-03",
        chosenFieldId: "A-05",
        state: "confirmed",
        candidateFieldIds: ["A-03", "A-05"],
        takenAt: "2026-07-20",
        takenAtSource: "xmp",
        width: 1600,
        height: 1200,
        uploadedAt: "2026-11-03T08:34:23.249Z",
        uploaderDevice: "dev-9",
      },
    ]);
  });

  it("写真のハッシュ・R2 のキー・更新時刻は本文に出ない", async () => {
    const { deps, testDb } = setup();
    const row = insert(testDb, { updated_at: "2099-01-01T00:00:00.000Z" });
    const response = await byField(deps, "?fieldId=A-03");
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toContain(row.id);
    expect(text).not.toContain(row.content_hash);
    expect(text).not.toContain("uploads/");
    expect(text).not.toContain("2099-01-01");
  });

  it("その番号に確定した写真だけ。ほかの圃場・未確定・確定で番号なしは返さない", async () => {
    const { deps, testDb } = setup();
    insert(testDb, { id: "hit" });
    insert(testDb, { id: "other-field", field_id: "A-04", candidate_field_ids: '["A-04"]' });
    insert(testDb, { id: "unconfirmed-chosen", state: "unconfirmed", field_id: null, chosen_field_id: "A-03" });
    insert(testDb, { id: "unconfirmed-candidate", state: "unconfirmed", field_id: null, candidate_field_ids: '["A-03"]' });
    // 未確定なのに field_id が入った行（今の書き方では作らないが、state で絞ることを確かめる）
    insert(testDb, { id: "unconfirmed-with-field", state: "unconfirmed", field_id: "A-03" });
    insert(testDb, { id: "confirmed-null", field_id: null });
    expect(await ids(await byField(deps, "?fieldId=A-03"))).toEqual(["hit"]);
  });

  it("A-01 を頼んで A-010 や A-1 を返さない（完全に一致するものだけ）", async () => {
    const { deps, testDb } = setup();
    insert(testDb, { id: "exact", field_id: "A-01" });
    insert(testDb, { id: "longer", field_id: "A-010" });
    insert(testDb, { id: "shorter", field_id: "A-1" });
    insert(testDb, { id: "lower", field_id: "a-01" });
    expect(await ids(await byField(deps, "?fieldId=A-01"))).toEqual(["exact"]);
  });

  it("撮影日の新しい順。届いた順・更新時刻では並べない", async () => {
    const { deps, testDb } = setup();
    insert(testDb, { id: "taken-old", taken_at: "2026-07-01", uploaded_at: "2026-11-03T09:00:00.000Z", updated_at: "2099-01-01T00:00:00.000Z" });
    insert(testDb, { id: "taken-new", taken_at: "2026-07-30", uploaded_at: "2026-11-01T00:00:00.000Z" });
    insert(testDb, { id: "taken-mid", taken_at: "2026-07-15", uploaded_at: "2026-11-02T00:00:00.000Z" });
    expect(await ids(await byField(deps, "?fieldId=A-03"))).toEqual(["taken-new", "taken-mid", "taken-old"]);
  });

  it("撮影日が無い写真は、撮影日のある写真の後ろ（届いた順の新しい順）", async () => {
    const { deps, testDb } = setup();
    insert(testDb, { id: "none-new", taken_at: null, taken_at_source: "none", uploaded_at: "2026-11-03T00:00:00.000Z" });
    insert(testDb, { id: "dated-old", taken_at: "2026-01-01", uploaded_at: "2026-11-01T00:00:00.000Z" });
    insert(testDb, { id: "none-old", taken_at: null, taken_at_source: "none", uploaded_at: "2026-11-02T00:00:00.000Z" });
    expect(await ids(await byField(deps, "?fieldId=A-03"))).toEqual(["dated-old", "none-new", "none-old"]);
  });

  it("撮影日が同じなら届いた順の新しい方、さらに同じなら id の降順", async () => {
    const { deps, testDb } = setup();
    // id の順と入れた順を逆にする（入れた順で偶然そろわないように。T21 の人の確認と同じ）
    insert(testDb, { id: "same-b", uploaded_at: "2026-11-02T00:00:00.000Z" });
    insert(testDb, { id: "same-a", uploaded_at: "2026-11-02T00:00:00.000Z" });
    insert(testDb, { id: "same-up-new", uploaded_at: "2026-11-03T00:00:00.000Z" });
    insert(testDb, { id: "same-up-old", uploaded_at: "2026-11-01T00:00:00.000Z" });
    expect(await ids(await byField(deps, "?fieldId=A-03"))).toEqual(["same-up-new", "same-b", "same-a", "same-up-old"]);
  });

  it(`件数は上限の ${RECENT_LIMIT_MAX} 枚まで（撮影日の新しい方から）。limit は読まない`, async () => {
    const { deps, testDb } = setup();
    for (let i = 0; i < RECENT_LIMIT_MAX + 1; i++) {
      const day = new Date(Date.UTC(2026, 0, 1) + i * 86_400_000).toISOString().slice(0, 10);
      insert(testDb, { id: `d${String(i).padStart(4, "0")}`, taken_at: day });
    }
    const all = await ids(await byField(deps, "?fieldId=A-03"));
    expect(all).toHaveLength(RECENT_LIMIT_MAX);
    expect(all[0]).toBe(`d${String(RECENT_LIMIT_MAX).padStart(4, "0")}`);
    expect(all).not.toContain("d0000");
    expect(await ids(await byField(deps, "?fieldId=A-03&limit=2"))).toHaveLength(RECENT_LIMIT_MAX);
  });

  it("fieldId が 2 つあれば最初の値。ほかのクエリは無視する", async () => {
    const { deps, testDb } = setup();
    insert(testDb, { id: "a1", field_id: "A-01" });
    insert(testDb, { id: "a2", field_id: "A-02" });
    expect(await ids(await byField(deps, "?fieldId=A-01&fieldId=A-02"))).toEqual(["a1"]);
    expect(await ids(await byField(deps, "?lat=41.8&fieldId=A-02&state=unconfirmed"))).toEqual(["a2"]);
    expect((await byField(deps, "?fieldId=A-99&fieldId=A-01")).status).toBe(400);
  });

  it("SQL は 1 文で、* もハッシュなどの列名も使わず、番号を SQL に入れずに bind で渡す", async () => {
    const { deps, testDb, prepare, sqls, binds } = setup();
    insert(testDb, { field_id: "A-07" });
    expect(await ids(await byField(deps, "?fieldId=A-07"))).toHaveLength(1);
    expect(prepare).toHaveBeenCalledTimes(1);
    expect(sqls[0]).not.toContain("*");
    expect(sqls[0]).not.toContain("A-07");
    for (const hidden of ["content_hash", "r2_key", "bytes", "updated_at"]) expect(sqls[0]).not.toContain(hidden);
    expect(binds).toHaveLength(1);
    expect(binds[0]).toContain("A-07");
    expect(binds[0]).toContain(RECENT_LIMIT_MAX);
  });

  it("候補の列が壊れた行があれば 500 で、中身を漏らさない", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { deps, testDb } = setup();
    insert(testDb, { candidate_field_ids: "secret-broken" });
    const response = await byField(deps, "?fieldId=A-03");
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("secret-broken");
  });

  it("ほかの圃場の壊れた行は、この圃場の一覧に響かない", async () => {
    const { deps, testDb } = setup();
    insert(testDb, { id: "ok" });
    insert(testDb, { id: "broken-elsewhere", field_id: "A-04", candidate_field_ids: "broken" });
    expect(await ids(await byField(deps, "?fieldId=A-03"))).toEqual(["ok"]);
  });

  it("認証なし: 壊れた Cookie でも 200 で、hmac を呼ばない。R2・newId・nowMs も使わない", async () => {
    const hmac = vi.fn(fakeDeps().hmac);
    const newId = vi.fn(() => "x");
    const nowMs = vi.fn(() => 0);
    const bucket = createTestBucket();
    const { deps, testDb } = setup({ hmac, newId, nowMs, photos: bucket.photos });
    insert(testDb);
    expect((await byField(deps, "?fieldId=A-03", "session=broken")).status).toBe(200);
    expect(hmac).not.toHaveBeenCalled();
    expect(newId).not.toHaveBeenCalled();
    expect(nowMs).not.toHaveBeenCalled();
    expect(bucket.calls).toEqual([]);
  });

  it("D1 が投げたら 500 で中身を漏らさない", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const broken = () => {
      throw new Error("secret-detail");
    };
    const response = await byField(fakeDeps({ db: { prepare: broken, batch: broken } }), "?fieldId=A-03");
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("secret-detail");
  });

  it("POST は 405 で Allow: GET", async () => {
    const { deps } = setup();
    const response = await handleRequest(request("POST", "/api/photos?fieldId=A-03"), deps);
    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET");
  });
});
