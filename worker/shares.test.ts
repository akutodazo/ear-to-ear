import { describe, expect, it, vi } from "vitest";
import { SHARE_BODY_MAX_BYTES, SHARE_DAILY_LIMIT } from "@/services/order-share-meta";
import { handleRequest } from "./app";
import type { DbPort, Deps } from "./deps";
import { createTestBucket, type TestBucket } from "./test-bucket";
import { createTestDb, type TestDb } from "./test-db";
import { fakeDeps, multipartBody, NOW_MS, sessionToken, tinyJpeg, type MultipartPart } from "./test-helpers";

const ID = "00000000-0000-4000-8000-000000000001";
const NOW_ISO = new Date(NOW_MS).toISOString();

const META = {
  season: "2026",
  district: "北地区",
  confirmedAt: "2026-11-06T03:00:00.000Z",
  ranked: ["A-02", "A-01"],
  benchmarkId: "A-01",
};

interface Setup {
  deps: Deps;
  testDb: TestDb;
  bucket: TestBucket;
}

function setup(overrides: Partial<Deps> = {}, testDb: TestDb = createTestDb()): Setup {
  const bucket = createTestBucket();
  const deps = fakeDeps({ db: testDb.db, photos: bucket.photos, ...overrides });
  return { deps, testDb, bucket };
}

function shareRequest(parts: MultipartPart[], headers: Record<string, string> = {}): Request {
  const boundary = "share-boundary-1";
  return new Request("https://example.test/api/shares", {
    method: "POST",
    headers: { "content-type": `multipart/form-data; boundary=${boundary}`, ...headers },
    body: multipartBody(parts, boundary),
  });
}

async function post(
  deps: Deps,
  options: { image?: Uint8Array; meta?: unknown; cookie?: string | null; extra?: MultipartPart[] } = {},
): Promise<Response> {
  const parts: MultipartPart[] = [
    { name: "image", value: options.image ?? tinyJpeg({ width: 1080, height: 1200 }) },
    { name: "meta", value: typeof options.meta === "string" ? options.meta : JSON.stringify(options.meta ?? META) },
    ...(options.extra ?? []),
  ];
  const cookie = options.cookie === undefined ? `session=${await sessionToken("member")}` : options.cookie;
  return handleRequest(shareRequest(parts, cookie === null ? {} : { cookie }), deps);
}

function rows(testDb: TestDb) {
  return testDb.raw.prepare("SELECT * FROM order_shares").all();
}

describe("POST /api/shares 置ける", () => {
  it("201 { id, url, imageUrl, expiresAt }。URL は要求の origin から作る", async () => {
    const { deps } = setup();
    const response = await post(deps);
    expect(response.status).toBe(201);
    expect(await response.json()).toStrictEqual({
      id: ID,
      url: `https://example.test/api/shares/${ID}`,
      imageUrl: `https://example.test/api/share-files/${ID}`,
      expiresAt: new Date(NOW_MS + 60 * 86_400_000).toISOString(),
    });
  });

  it("admin でも置ける", async () => {
    const { deps } = setup();
    expect((await post(deps, { cookie: `session=${await sessionToken("admin")}` })).status).toBe(201);
  });

  it("R2 に shares/<id>.jpg を 1 つ、中身は送った画像そのまま", async () => {
    const { deps, bucket } = setup();
    const image = tinyJpeg({ width: 1080, height: 1200, scanBytes: 300 });
    await post(deps, { image });
    expect([...bucket.objects.keys()]).toEqual([`shares/${ID}.jpg`]);
    expect(bucket.objects.get(`shares/${ID}.jpg`)).toEqual({ bytes: image, contentType: "image/jpeg" });
  });

  it("D1 に 1 行。番号の並びだけを持ち、座標・距離は持たない", async () => {
    const { deps, testDb } = setup();
    await post(deps);
    expect(rows(testDb)).toEqual([
      {
        id: ID,
        season: "2026",
        district: "北地区",
        ranked: JSON.stringify(["A-02", "A-01"]),
        benchmark_id: "A-01",
        confirmed_at: "2026-11-06T03:00:00.000Z",
        r2_key: `shares/${ID}.jpg`,
        bytes: expect.any(Number),
        width: 1080,
        height: 1200,
        actor_device: "dev-member",
        created_at: NOW_ISO,
        expires_at: new Date(NOW_MS + 60 * 86_400_000).toISOString(),
      },
    ]);
  });

  it("置くたびに期限切れの行を消す", async () => {
    const { deps, testDb } = setup();
    testDb.raw
      .prepare(
        "INSERT INTO order_shares (id, season, district, ranked, benchmark_id, confirmed_at, r2_key, bytes, width, height, actor_device, created_at, expires_at) " +
          "VALUES ('old', '2026', '北地区', '[]', NULL, 'x', 'shares/old.jpg', 1, 1, 1, 'd', 'x', ?)",
      )
      .run(new Date(NOW_MS - 1).toISOString());
    await post(deps);
    expect((rows(testDb) as { id: string }[]).map((r) => r.id)).toEqual([ID]);
  });
});

describe("POST /api/shares 断る", () => {
  it("Cookie が無ければ 401", async () => {
    const { deps, bucket } = setup();
    expect((await post(deps, { cookie: null })).status).toBe(401);
    expect(bucket.calls).toEqual([]);
  });

  it("multipart でなければ 415", async () => {
    const { deps } = setup();
    const request = new Request("https://example.test/api/shares", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: `session=${await sessionToken("member")}` },
      body: JSON.stringify(META),
    });
    expect((await handleRequest(request, deps)).status).toBe(415);
  });

  it("本文が上限を超えると申告されたら 413", async () => {
    const { deps } = setup();
    const response = await handleRequest(
      shareRequest([{ name: "image", value: tinyJpeg() }, { name: "meta", value: "{}" }], {
        cookie: `session=${await sessionToken("member")}`,
        "content-length": String(SHARE_BODY_MAX_BYTES + 1),
      }),
      deps,
    );
    expect(response.status).toBe(413);
  });

  it("画像の検査: APP1 付きは metadata、JPEG でなければ not_jpeg、長辺 2000 超は bad_dimensions", async () => {
    const cases: [Uint8Array, string][] = [
      [tinyJpeg({ apps: [1] }), "metadata"],
      [new TextEncoder().encode("not a jpeg"), "not_jpeg"],
      [tinyJpeg({ width: 2001, height: 100 }), "bad_dimensions"],
    ];
    for (const [image, reason] of cases) {
      const { deps, bucket } = setup();
      const response = await post(deps, { image });
      expect(response.status).toBe(422);
      expect(await response.json()).toMatchObject({ reason });
      expect(bucket.calls).toEqual([]);
    }
  });

  it("欄が余分なら bad_form", async () => {
    const { deps } = setup();
    const response = await post(deps, { extra: [{ name: "lat", value: "43.2" }] });
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ reason: "bad_form" });
  });

  it("meta の誤りは 422 と理由（地区に無い番号）", async () => {
    const { deps, testDb } = setup();
    const response = await post(deps, { meta: { ...META, ranked: ["A-99"] } });
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ reason: "unknown_field" });
    expect(rows(testDb)).toEqual([]);
  });

  it("D1 の INSERT が投げたら、置いた画像を消して 500", async () => {
    const testDb = createTestDb();
    const db: DbPort = {
      prepare: (sql) => {
        if (/INSERT INTO order_shares/i.test(sql)) throw new Error("secret-detail");
        return testDb.db.prepare(sql);
      },
      batch: (s) => testDb.db.batch(s),
    };
    const { deps, bucket } = setup({ db }, testDb);
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = await post(deps);
    spy.mockRestore();
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("secret-detail");
    expect(bucket.calls.map((c) => c.op)).toEqual(["put", "delete"]);
  });

  it(`同じ端末で 1 日 ${SHARE_DAILY_LIMIT} 回まで。超えたら 429 と Retry-After、R2 には置かない`, async () => {
    const testDb = createTestDb();
    let n = 0;
    const { deps, bucket } = setup({ newId: () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}` }, testDb);
    for (let i = 0; i < SHARE_DAILY_LIMIT; i++) expect((await post(deps)).status).toBe(201);
    const puts = bucket.calls.filter((c) => c.op === "put").length;
    const response = await post(deps);
    expect(response.status).toBe(429);
    expect(Number(response.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(bucket.calls.filter((c) => c.op === "put").length).toBe(puts);
  });
});
