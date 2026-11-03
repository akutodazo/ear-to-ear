import { describe, expect, it, vi } from "vitest";
import { createTestDb } from "./test-db";
import { fakeDeps, request } from "./test-helpers";

// 既定と上限を変えたら追従することを、設定を差し替えて確かめる（50・200 の直書きを防ぐ）
vi.mock("@/config", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/config")>()),
  RECENT_LIMIT_DEFAULT: 2,
  RECENT_LIMIT_MAX: 3,
}));

async function count(query: string): Promise<number> {
  const { handleRequest } = await import("./app");
  const testDb = createTestDb();
  for (let i = 0; i < 5; i++) {
    testDb.raw
      .prepare(
        "INSERT INTO uploaded_photos (id, field_id, chosen_field_id, state, candidate_field_ids, taken_at, taken_at_source, content_hash, r2_key, width, height, bytes, uploader_device, uploaded_at, updated_at) VALUES (?, NULL, NULL, 'unconfirmed', '[]', NULL, 'none', ?, ?, 1, 1, 1, 'd', ?, ?)",
      )
      .run(`p${i}`, String(i).repeat(64), `uploads/p${i}.jpg`, `2026-11-03T00:00:0${i}.000Z`, "x");
  }
  const response = await handleRequest(request("GET", `/api/photos/recent${query}`), fakeDeps({ db: testDb.db }));
  return ((await response.json()) as unknown[]).length;
}

describe("GET /api/photos/recent は config に従う", () => {
  it("limit が無ければ RECENT_LIMIT_DEFAULT（2）", async () => {
    expect(await count("")).toBe(2);
  });

  it("上限は RECENT_LIMIT_MAX（3）", async () => {
    expect(await count("?limit=10")).toBe(3);
  });
});
