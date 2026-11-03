import { describe, expect, it, vi } from "vitest";
import { createTestBucket } from "./test-bucket";
import { createTestDb } from "./test-db";
import { fakeDeps, multipartRequest, sessionToken, tinyJpeg } from "./test-helpers";

// 画像の上限と長辺の上限を変えたら追従することを、設定を差し替えて確かめる（直書きを防ぐ）
vi.mock("@/config", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/config")>()),
  MAX_UPLOAD_BYTES: 4000,
  THUMBNAIL_LONG_EDGE_PX: 800,
}));

const META = JSON.stringify({
  contentHash: "cd".repeat(32),
  takenAt: null,
  takenAtSource: "none",
  candidateFieldIds: [],
  chosenFieldId: null,
});

async function upload(image: Uint8Array): Promise<Response> {
  const { handleRequest } = await import("./app");
  const deps = fakeDeps({ db: createTestDb().db, photos: createTestBucket().photos });
  const req = multipartRequest(
    [
      { name: "image", value: image },
      { name: "meta", value: META },
    ],
    { cookie: `session=${await sessionToken("member")}` },
  );
  return handleRequest(req, deps);
}

describe("POST /api/uploads は config に従う", () => {
  it("画像の上限は MAX_UPLOAD_BYTES（4000）", async () => {
    const base = tinyJpeg({ width: 800, height: 600 }).byteLength;
    expect((await upload(tinyJpeg({ width: 800, height: 600, scanBytes: 4000 - base + 2 }))).status).toBe(201);
    expect((await upload(tinyJpeg({ width: 800, height: 600, scanBytes: 4000 - base + 3 }))).status).toBe(413);
  });

  it("長辺の上限は THUMBNAIL_LONG_EDGE_PX（800）", async () => {
    const response = await upload(tinyJpeg({ width: 801, height: 600 }));
    expect(response.status).toBe(422);
    expect(await response.json()).toStrictEqual({ error: "unprocessable", reason: "bad_dimensions" });
  });
});
