import { afterEach, describe, expect, it, vi } from "vitest";
import { handleRequest } from "./app";
import type { DbPort, Deps } from "./deps";
import { createTestBucket } from "./test-bucket";
import { createTestDb, type TestDb } from "./test-db";
import { fakeDeps, request } from "./test-helpers";

const HASH = "cd".repeat(32);

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

function insert(testDb: TestDb, overrides: Partial<Row> = {}): Row {
  const id = overrides.id ?? `p-${Math.random().toString(16).slice(2)}`;
  const row: Row = {
    id,
    field_id: null,
    chosen_field_id: null,
    state: "unconfirmed",
    candidate_field_ids: '["A-06"]',
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

/** n 件を 1 秒ずつずらして入れる（i が大きいほど新しい） */
function insertMany(testDb: TestDb, n: number): void {
  for (let i = 0; i < n; i++) {
    insert(testDb, { id: `p${String(i).padStart(4, "0")}`, uploaded_at: new Date(Date.UTC(2026, 10, 3, 0, 0, i)).toISOString() });
  }
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

async function recent(deps: Deps, query = "", cookie?: string): Promise<Response> {
  return handleRequest(request("GET", `/api/photos/recent${query}`, cookie), deps);
}

async function ids(response: Response): Promise<string[]> {
  return ((await response.json()) as { id: string }[]).map((p) => p.id);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/photos/recent", () => {
  it("写真が無ければ 200 [] で、JSON と共通ヘッダ（no-store）", async () => {
    const { deps } = setup();
    const response = await recent(deps);
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
      state: "confirmed",
      candidate_field_ids: '["A-03","A-05"]',
      uploader_device: "dev-9",
      uploaded_at: "2026-11-03T08:34:23.249Z",
    });
    expect(await (await recent(deps)).json()).toStrictEqual([
      {
        id: "p1",
        fieldId: "A-03",
        chosenFieldId: "A-05",
        state: "confirmed",
        candidateFieldIds: ["A-03", "A-05"],
        takenAt: "2026-07-24",
        takenAtSource: "exif",
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
    const response = await recent(deps);
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toContain(row.id);
    expect(text).not.toContain(row.content_hash);
    expect(text).not.toContain("uploads/");
    expect(text).not.toContain("2099-01-01");
  });

  it("SQL は 1 文で、* もハッシュなどの列名も使わず、件数は数で渡す", async () => {
    const { deps, testDb, prepare, sqls, binds } = setup();
    insert(testDb);
    await recent(deps, "?limit=5");
    expect(prepare).toHaveBeenCalledTimes(1);
    expect(sqls[0]).not.toContain("*");
    for (const hidden of ["content_hash", "r2_key", "bytes", "updated_at"]) expect(sqls[0]).not.toContain(hidden);
    expect(binds).toEqual([[5]]);
  });

  it("新しく届いた順。同じ時刻なら id の降順。撮影日と更新時刻では並べない", async () => {
    const { deps, testDb } = setup();
    insert(testDb, { id: "old", uploaded_at: "2026-11-01T00:00:00.000Z", taken_at: "2026-12-31", updated_at: "2099-01-01T00:00:00.000Z" });
    insert(testDb, { id: "new", uploaded_at: "2026-11-03T00:00:00.000Z", taken_at: "2026-01-01" });
    // 同じ時刻の 2 つは、id の順と入れた順を逆にする（入れた順で偶然そろわないように。人の確認で直した）
    insert(testDb, { id: "tie-b", uploaded_at: "2026-11-02T00:00:00.000Z" });
    insert(testDb, { id: "tie-a", uploaded_at: "2026-11-02T00:00:00.000Z" });
    expect(await ids(await recent(deps))).toEqual(["new", "tie-b", "tie-a", "old"]);
  });

  it("未確定も確定も、状態で絞らずに返す", async () => {
    const { deps, testDb } = setup();
    insert(testDb, { id: "u", state: "unconfirmed" });
    insert(testDb, { id: "c", state: "confirmed", field_id: "A-01" });
    expect((await ids(await recent(deps))).sort()).toEqual(["c", "u"]);
  });

  it("?limit=2 なら新しい 2 枚", async () => {
    const { deps, testDb } = setup();
    insertMany(testDb, 5);
    expect(await ids(await recent(deps, "?limit=2"))).toEqual(["p0004", "p0003"]);
  });

  it.each(["", "?limit=", "?limit=0", "?limit=abc", "?limit=1.5"])("%s なら既定の 50 枚", async (query) => {
    const { deps, testDb } = setup();
    insertMany(testDb, 52);
    expect(await ids(await recent(deps, query))).toHaveLength(50);
  });

  it("?limit=100000 なら上限の 200 枚", async () => {
    const { deps, testDb } = setup();
    insertMany(testDb, 201);
    expect(await ids(await recent(deps, "?limit=100000"))).toHaveLength(200);
  });

  it("limit が 2 つあれば最初の値。ほかのクエリは無視する", async () => {
    const { deps, testDb } = setup();
    insertMany(testDb, 5);
    expect(await ids(await recent(deps, "?limit=1&limit=5"))).toHaveLength(1);
    expect(await ids(await recent(deps, "?limit=2&fieldId=A-01&lat=41.8"))).toHaveLength(2);
  });

  it("確定で番号が null の行も、そのまま返す", async () => {
    const { deps, testDb } = setup();
    insert(testDb, { state: "confirmed", field_id: null });
    expect(await (await recent(deps)).json()).toMatchObject([{ state: "confirmed", fieldId: null }]);
  });

  it("候補の列が壊れた行があれば 500 で、中身を漏らさない", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { deps, testDb } = setup();
    insert(testDb, { candidate_field_ids: "secret-broken" });
    const response = await recent(deps);
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("secret-broken");
  });

  it("認証なし: 壊れた Cookie でも 200 で、hmac を呼ばない。R2・newId・nowMs も使わない", async () => {
    const hmac = vi.fn(fakeDeps().hmac);
    const newId = vi.fn(() => "x");
    const nowMs = vi.fn(() => 0);
    const bucket = createTestBucket();
    const { deps, testDb } = setup({ hmac, newId, nowMs, photos: bucket.photos });
    insert(testDb);
    expect((await recent(deps, "", "session=broken")).status).toBe(200);
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
    const response = await recent(fakeDeps({ db: { prepare: broken, batch: broken } }));
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("secret-detail");
  });

  it("POST は 405 で Allow: GET", async () => {
    const { deps } = setup();
    const response = await handleRequest(request("POST", "/api/photos/recent"), deps);
    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET");
  });
});
