import { describe, expect, it } from "vitest";
import { createTestBucket } from "./test-bucket";

describe("テスト用の R2", () => {
  it("put は複製して持ち、contentType も残す", async () => {
    const { photos, objects } = createTestBucket();
    const bytes = new Uint8Array([1, 2, 3]);
    await photos.put("uploads/a.jpg", bytes, { httpMetadata: { contentType: "image/jpeg" } });
    bytes[0] = 9;
    expect(objects.get("uploads/a.jpg")).toEqual({ bytes: new Uint8Array([1, 2, 3]), contentType: "image/jpeg" });
  });

  it("get は中身と大きさ、無ければ null", async () => {
    const { photos } = createTestBucket();
    await photos.put("k", new Uint8Array([4, 5]));
    const got = await photos.get("k");
    expect(got?.size).toBe(2);
    expect(new Uint8Array(await new Response(got?.body).arrayBuffer())).toEqual(new Uint8Array([4, 5]));
    expect(await photos.get("none")).toBeNull();
  });

  it("delete は無くても成功し、呼ばれた順が残る", async () => {
    const { photos, objects, calls } = createTestBucket();
    await photos.put("k", new Uint8Array([1]));
    await photos.delete("k");
    await photos.delete("k");
    expect(objects.size).toBe(0);
    expect(calls).toEqual([
      { op: "put", key: "k" },
      { op: "delete", key: "k" },
      { op: "delete", key: "k" },
    ]);
  });
});

describe("テスト用の multipart と JPEG（test-helpers）", () => {
  it("multipartRequest の本文を formData() で読むと、欄の名前・値・ファイルが戻る", async () => {
    const { multipartRequest, tinyJpeg } = await import("./test-helpers");
    const image = tinyJpeg();
    const form = await multipartRequest([
      { name: "image", value: image },
      { name: "meta", value: '{"a":1}' },
    ]).formData();
    expect(form.get("meta")).toBe('{"a":1}');
    const file = form.get("image");
    expect(typeof file).not.toBe("string");
    expect(new Uint8Array(await (file as Blob).arrayBuffer())).toEqual(image);
  });

  it("tinyJpeg は inspectJpeg で読め、apps と大きさが効く", async () => {
    const { tinyJpeg } = await import("./test-helpers");
    const { inspectJpeg } = await import("@/services/jpeg-segments");
    expect(inspectJpeg(tinyJpeg({ width: 800, height: 600 }))).toEqual({ width: 800, height: 600, appSegments: [] });
    expect(inspectJpeg(tinyJpeg({ apps: [1, 2] })).appSegments).toEqual([1, 2]);
    const big = tinyJpeg({ scanBytes: 1000 });
    expect(big.byteLength).toBe(tinyJpeg().byteLength + 998);
    expect([...big.slice(-2)]).toEqual([0xff, 0xd9]);
  });
});
