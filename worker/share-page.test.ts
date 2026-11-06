import { describe, expect, it } from "vitest";
import { handleRequest } from "./app";
import { createTestBucket } from "./test-bucket";
import { createTestDb, type TestDb } from "./test-db";
import { fakeDeps, NOW_MS, request, tinyJpeg } from "./test-helpers";

const ID = "00000000-0000-4000-8000-0000000000aa";

function insert(testDb: TestDb, id: string, expiresAt: string): void {
  testDb.raw
    .prepare(
      "INSERT INTO order_shares (id, season, district, ranked, benchmark_id, confirmed_at, r2_key, bytes, width, height, actor_device, created_at, expires_at) " +
        "VALUES (?, '2026', '北地区', '[\"A-02\",\"A-01\"]', 'A-01', '2026-11-06T03:00:00.000Z', ?, 10, 1080, 1200, 'dev-secret-device', 'x', ?)",
    )
    .run(id, `shares/${id}.jpg`, expiresAt);
}

function setup() {
  const testDb = createTestDb();
  const bucket = createTestBucket();
  const deps = fakeDeps({ db: testDb.db, photos: bucket.photos });
  return { testDb, bucket, deps };
}

const LATER = new Date(NOW_MS + 86_400_000).toISOString();
const EARLIER = new Date(NOW_MS - 1).toISOString();

describe("GET /api/shares/:id（OGP の HTML）", () => {
  it("Cookie 無しで 200 text/html。og:image は要求の origin の絶対 URL", async () => {
    const { testDb, deps } = setup();
    insert(testDb, ID, LATER);
    const response = await handleRequest(request("GET", `/api/shares/${ID}`), deps);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8");
    const html = await response.text();
    expect(html).toContain(`<meta property="og:image" content="https://example.test/api/share-files/${ID}">`);
    expect(html).toContain('<meta property="og:title" content="北地区 刈る順番 11/6 確定">');
  });

  it("検索に出さず、短くキャッシュし、外の物を読ませない", async () => {
    const { testDb, deps } = setup();
    insert(testDb, ID, LATER);
    const response = await handleRequest(request("GET", `/api/shares/${ID}`), deps);
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(response.headers.get("cache-control")).toBe("public, max-age=300");
    expect(response.headers.get("content-security-policy")).toContain("default-src 'none'");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("HTML に端末 ID が出ない", async () => {
    const { testDb, deps } = setup();
    insert(testDb, ID, LATER);
    const html = await (await handleRequest(request("GET", `/api/shares/${ID}`), deps)).text();
    expect(html).not.toContain("dev-secret-device");
  });

  it("無い id・期限切れは 404", async () => {
    const { testDb, deps } = setup();
    insert(testDb, ID, EARLIER);
    expect((await handleRequest(request("GET", `/api/shares/${ID}`), deps)).status).toBe(404);
    expect((await handleRequest(request("GET", "/api/shares/nothing"), deps)).status).toBe(404);
  });
});

describe("GET /api/share-files/:id（絵）", () => {
  it("Cookie 無しで 200 image/jpeg、中身は R2 の物", async () => {
    const { testDb, bucket, deps } = setup();
    insert(testDb, ID, LATER);
    const image = tinyJpeg({ width: 1080, height: 1200 });
    await bucket.photos.put(`shares/${ID}.jpg`, image, { httpMetadata: { contentType: "image/jpeg" } });
    const response = await handleRequest(request("GET", `/api/share-files/${ID}`), deps);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/jpeg");
    expect(response.headers.get("content-length")).toBe(String(image.byteLength));
    expect(response.headers.get("cache-control")).toBe("public, max-age=86400");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(image);
  });

  it("期限切れは R2 を読まずに 404", async () => {
    const { testDb, bucket, deps } = setup();
    insert(testDb, ID, EARLIER);
    await bucket.photos.put(`shares/${ID}.jpg`, tinyJpeg(), {});
    bucket.calls.length = 0;
    const response = await handleRequest(request("GET", `/api/share-files/${ID}`), deps);
    expect(response.status).toBe(404);
    expect(bucket.calls).toEqual([]);
  });

  it("行があっても R2 に無ければ 404", async () => {
    const { testDb, deps } = setup();
    insert(testDb, ID, LATER);
    expect((await handleRequest(request("GET", `/api/share-files/${ID}`), deps)).status).toBe(404);
  });
});
