import { describe, expect, it } from "vitest";
import type { OrderShareMeta } from "@/services/order-share-meta";
import { createHttpOrderShareRepository } from "./http-order-share-repository";
import type { FetchLike } from "./http-photo-repository";

function fakeFetch(respond: () => Response | Promise<Response>) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fn: FetchLike = async (url, init) => {
    calls.push({ url, init });
    return respond();
  };
  return { fn, calls };
}

const META: OrderShareMeta = {
  season: "2026",
  district: "北地区",
  confirmedAt: "2026-11-06T03:00:00.000Z",
  ranked: ["A-02", "A-01"],
  benchmarkId: "A-01",
};

const IMAGE = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], { type: "image/jpeg" });

const CREATED = {
  id: "abc",
  url: "https://example.test/api/shares/abc",
  imageUrl: "https://example.test/api/share-files/abc",
  expiresAt: "2027-01-05T03:00:00.000Z",
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("create（POST /api/shares）", () => {
  it("multipart の image と meta を 1 つずつ、POST で送る", async () => {
    const { fn, calls } = fakeFetch(() => json(201, CREATED));
    await createHttpOrderShareRepository(fn, "https://base.test").create(IMAGE, META);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://base.test/api/shares");
    expect(calls[0].init?.method).toBe("POST");
    const body = calls[0].init?.body;
    expect(body).toBeInstanceOf(FormData);
    const form = body as FormData;
    expect([...form.keys()]).toEqual(["image", "meta"]);
    expect(form.get("image")).toBeInstanceOf(Blob);
    expect(JSON.parse(form.get("meta") as string)).toEqual(META);
  });

  it("201 を { id, url, expiresAt } に読む", async () => {
    const { fn } = fakeFetch(() => json(201, CREATED));
    expect(await createHttpOrderShareRepository(fn).create(IMAGE, META)).toStrictEqual({
      kind: "created",
      share: { id: "abc", url: CREATED.url, expiresAt: CREATED.expiresAt },
    });
  });

  it("201 でも形が違えば error（URL が https でない・項目が無い）", async () => {
    for (const body of [{}, { ...CREATED, url: 1 }, { ...CREATED, url: "javascript:alert(1)" }, null]) {
      const { fn } = fakeFetch(() => json(201, body));
      expect(await createHttpOrderShareRepository(fn).create(IMAGE, META)).toStrictEqual({ kind: "error" });
    }
  });

  it("状態を種類に分ける", async () => {
    const cases: [Response, unknown][] = [
      [json(401, { error: "unauthorized" }), { kind: "unauthorized" }],
      [json(413, { error: "payload_too_large" }), { kind: "too-large" }],
      [json(422, { error: "unprocessable", reason: "unknown_field" }), { kind: "rejected", reason: "unknown_field" }],
      [new Response("x", { status: 422 }), { kind: "rejected", reason: null }],
      [json(429, { error: "too_many_requests" }), { kind: "usage-limit" }],
      [json(500, { error: "internal" }), { kind: "error" }],
    ];
    for (const [response, outcome] of cases) {
      const { fn } = fakeFetch(() => response);
      expect(await createHttpOrderShareRepository(fn).create(IMAGE, META)).toStrictEqual(outcome);
    }
  });

  it("通信できなければ network-error", async () => {
    const offline: FetchLike = async () => {
      throw new TypeError("Failed to fetch");
    };
    expect(await createHttpOrderShareRepository(offline).create(IMAGE, META)).toStrictEqual({ kind: "network-error" });
  });
});
