import { afterEach, describe, expect, it, vi } from "vitest";
import { handleRequest } from "./app";
import type { Deps } from "./deps";
import { PHOTO_FILE_CACHE_CONTROL } from "./photo-files";
import { createTestBucket, type TestBucket } from "./test-bucket";
import { fakeDeps, request, tinyJpeg } from "./test-helpers";

function setup(overrides: Partial<Deps> = {}): { deps: Deps; bucket: TestBucket } {
  const bucket = createTestBucket();
  // db は fakeDeps の既定（呼ぶと投げる）。D1 を触らないことを確かめる
  return { deps: fakeDeps({ photos: bucket.photos, ...overrides }), bucket };
}

async function get(deps: Deps, id: string): Promise<Response> {
  return handleRequest(request("GET", `/api/photo-files/${id}`), deps);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/photo-files/:id", () => {
  it("あれば 200 で、本文は R2 の画像そのまま", async () => {
    const { deps, bucket } = setup();
    const image = tinyJpeg({ scanBytes: 300 });
    await bucket.photos.put("uploads/p1.jpg", image);
    const response = await get(deps, "p1");
    expect(response.status).toBe(200);
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(image);
  });

  it("image/jpeg・content-length・キャッシュ（private, max-age=86400）・nosniff", async () => {
    const { deps, bucket } = setup();
    const image = tinyJpeg({ scanBytes: 300 });
    await bucket.photos.put("uploads/p1.jpg", image);
    const response = await get(deps, "p1");
    expect(PHOTO_FILE_CACHE_CONTROL).toBe("private, max-age=86400");
    expect(response.headers.get("content-type")).toBe("image/jpeg");
    expect(response.headers.get("content-length")).toBe(String(image.byteLength));
    expect(response.headers.get("cache-control")).toBe(PHOTO_FILE_CACHE_CONTROL);
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("R2 のキーは uploads/<id>.jpg ちょうどで、get を 1 回だけ", async () => {
    const { deps, bucket } = setup();
    await bucket.photos.put("uploads/p1.jpg", tinyJpeg());
    bucket.calls.length = 0;
    await get(deps, "p1");
    expect(bucket.calls).toEqual([{ op: "get", key: "uploads/p1.jpg" }]);
  });

  it("無ければ 404 { error: not_found }（D1 を触らない）", async () => {
    const { deps } = setup();
    const response = await get(deps, "nope");
    expect(response.status).toBe(404);
    expect(await response.json()).toStrictEqual({ error: "not_found" });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it(".. は URL が正規化されて経路に当たらず 404（R2 を読まない）", async () => {
    const { deps, bucket } = setup();
    expect((await get(deps, "..")).status).toBe(404);
    expect(bucket.calls).toEqual([]);
  });

  it.each(["p%2F1", "p1.jpg"])("%s は復号も検査もせずキーにして、無ければ 404", async (id) => {
    const { deps, bucket } = setup();
    await bucket.photos.put("uploads/p1.jpg", tinyJpeg());
    expect((await get(deps, id)).status).toBe(404);
    expect(bucket.calls.at(-1)).toEqual({ op: "get", key: `uploads/${id}.jpg` });
  });

  it("R2 が投げたら 500 で中身を漏らさない", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const bucket = createTestBucket();
    bucket.photos.get = async () => {
      throw new Error("secret-detail");
    };
    const response = await get(fakeDeps({ photos: bucket.photos }), "p1");
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("secret-detail");
  });

  it("認証なし: 壊れた Cookie でも 200 で hmac を呼ばない", async () => {
    const hmac = vi.fn(fakeDeps().hmac);
    const { deps, bucket } = setup({ hmac });
    await bucket.photos.put("uploads/p1.jpg", tinyJpeg());
    expect((await handleRequest(request("GET", "/api/photo-files/p1", "session=broken"), deps)).status).toBe(200);
    expect(hmac).not.toHaveBeenCalled();
  });

  it("POST は 405 で Allow: GET", async () => {
    const { deps } = setup();
    const response = await handleRequest(request("POST", "/api/photo-files/p1"), deps);
    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET");
  });
});
