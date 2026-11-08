// みっきぃ 7（#220）: GET /api/judgments/:id。LINE のサーバーが Cookie 無しで読む判断の OGP ページ
import { describe, expect, it } from "vitest";
import { handleRequest } from "./app";
import { createTestDb, type TestDb } from "./test-db";
import { fakeDeps, request } from "./test-helpers";

const AT = "2026-07-21T01:00:00.000Z";

function insertPhoto(testDb: TestDb, id: string): void {
  testDb.raw
    .prepare(
      "INSERT INTO uploaded_photos (id, field_id, chosen_field_id, state, candidate_field_ids, taken_at, taken_at_source, content_hash, r2_key, width, height, bytes, uploader_device, uploaded_at, updated_at) " +
        "VALUES (?, 'A-03', NULL, 'confirmed', '[\"A-03\"]', '2026-07-21', 'exif', ?, ?, 1600, 1200, 10, 'dev-1', ?, ?)",
    )
    .run(id, id.padEnd(64, "0"), `uploads/${id}.jpg`, AT, AT);
}

function insertEvent(testDb: TestDb, overrides: Record<string, string | number | null> = {}): void {
  const row: Record<string, string | number | null> = {
    id: 5,
    field_id: "A-03",
    status: "ready",
    reasons: '["ear_color"]',
    note: "メモは出さない",
    ref_photo_ids: '["p-1"]',
    actor_device: "dev-secret-device",
    at: AT,
    revoked_at: null,
    ...overrides,
  };
  const columns = Object.keys(row);
  testDb.raw
    .prepare(`INSERT INTO field_status_events (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`)
    .run(...Object.values(row));
}

function setup() {
  const testDb = createTestDb();
  return { testDb, deps: fakeDeps({ db: testDb.db }) };
}

describe("GET /api/judgments/:id（判断の OGP ページ）", () => {
  it("Cookie 無しで 200 text/html。og:image は根拠の写真の絶対 URL、幅と高さも", async () => {
    const { testDb, deps } = setup();
    insertPhoto(testDb, "p-1");
    insertEvent(testDb);
    const response = await handleRequest(request("GET", "/api/judgments/5"), deps);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8");
    const html = await response.text();
    expect(html).toContain('<meta property="og:image" content="https://example.test/api/photo-files/p-1">');
    expect(html).toContain('<meta property="og:image:height" content="1200">');
    expect(html).not.toContain("メモは出さない");
    expect(html).not.toContain("dev-secret-device");
  });

  it("検索に出さず、短くキャッシュし、外の物を読ませない", async () => {
    const { testDb, deps } = setup();
    insertEvent(testDb);
    const response = await handleRequest(request("GET", "/api/judgments/5"), deps);
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(response.headers.get("cache-control")).toBe("public, max-age=300");
    expect(response.headers.get("content-security-policy")).toContain("default-src 'none'");
  });

  it("根拠の写真が無い（消えた）ときは og:image を出さない", async () => {
    const { testDb, deps } = setup();
    insertEvent(testDb, { ref_photo_ids: "[]" });
    const html = await (await handleRequest(request("GET", "/api/judgments/5"), deps)).text();
    expect(html).not.toContain("og:image");
  });

  it("取り消し済みは 200 で取り消しの題（?revoked の有無に関わらず D1 が正）", async () => {
    const { testDb, deps } = setup();
    insertEvent(testDb, { revoked_at: "2026-07-22T03:30:00.000Z" });
    for (const path of ["/api/judgments/5", "/api/judgments/5?revoked=1"]) {
      const response = await handleRequest(request("GET", path), deps);
      expect(response.status).toBe(200);
      expect(await response.text()).toContain("の判断を取り消しました");
    }
  });

  it("無い id・数でない id は 404", async () => {
    const { deps } = setup();
    expect((await handleRequest(request("GET", "/api/judgments/99"), deps)).status).toBe(404);
    expect((await handleRequest(request("GET", "/api/judgments/abc"), deps)).status).toBe(404);
  });
});
