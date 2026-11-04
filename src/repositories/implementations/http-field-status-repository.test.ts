import { describe, expect, it } from "vitest";
import type { FieldSummary, StatusEvent } from "@/types";
import type { StatusInput } from "@/services/status-reason";
import { createHttpFieldStatusRepository } from "./http-field-status-repository";
import type { FetchLike } from "./http-photo-repository";

/** 呼ばれた要求を記録し、決まった応答を返す偽の fetch */
function fakeFetch(respond: () => Response | Promise<Response>) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fn: FetchLike = async (url, init) => {
    calls.push({ url, init });
    return respond();
  };
  return { fn, calls };
}

const offline: FetchLike = async () => {
  throw new TypeError("Failed to fetch");
};

const repo = (fn: FetchLike) => createHttpFieldStatusRepository(fn);

const ev: StatusEvent = {
  id: 7,
  fieldId: "A-06",
  status: "ready",
  reasons: ["ear_color"],
  note: "穂が黄色い",
  refPhotoIds: ["p1"],
  actorDevice: "d1",
  at: "2026-07-21T01:00:00.000Z",
  revokedAt: null,
};

const input: StatusInput = { status: "ready", reasons: ["ear_color"], note: null, refPhotoIds: ["p1"] };

describe("listSummary（GET /api/fields/summary）", () => {
  const fields: FieldSummary[] = [
    { fieldId: "A-01", latest: null, hasUnconfirmed: false },
    { fieldId: "A-06", latest: ev, hasUnconfirmed: true },
  ];

  it("認証なしの GET で読み、200 の fields を返す", async () => {
    const { fn, calls } = fakeFetch(() => Response.json({ fields }));
    expect(await repo(fn).listSummary()).toEqual({ kind: "ok", fields });
    expect(calls[0].url).toBe("/api/fields/summary");
    expect(calls[0].init?.method ?? "GET").toBe("GET");
  });

  it("fields が配列でない・本文が読めない・200 以外は error、つながらなければ network-error", async () => {
    for (const respond of [
      () => Response.json(fields),
      () => Response.json({ fields: {} }),
      () => new Response("{", { status: 200 }),
      () => Response.json({ fields }, { status: 500 }),
    ]) {
      expect(await repo(fakeFetch(respond).fn).listSummary()).toEqual({ kind: "error" });
    }
    expect(await repo(offline).listSummary()).toEqual({ kind: "network-error" });
  });
});

describe("listHistory（GET /api/fields/:id/status-events、T26）", () => {
  it("番号を URL の形に直して GET で読み、200 の配列を返す", async () => {
    const { fn, calls } = fakeFetch(() => Response.json([ev]));
    expect(await repo(fn).listHistory("A-06")).toEqual({ kind: "ok", events: [ev] });
    await repo(fn).listHistory("A 06/x");
    expect(calls.map((c) => c.url)).toStrictEqual([
      "/api/fields/A-06/status-events",
      "/api/fields/A%2006%2Fx/status-events",
    ]);
    expect(calls[0].init?.method ?? "GET").toBe("GET");
  });

  it("配列でない・読めない本文、400・404・500 は error、つながらなければ network-error", async () => {
    for (const respond of [
      () => Response.json({ events: [] }),
      () => new Response("[", { status: 200 }),
      () => Response.json([ev], { status: 400 }),
      () => Response.json({ error: "not_found" }, { status: 404 }),
      () => new Response(null, { status: 500 }),
    ]) {
      expect(await repo(fakeFetch(respond).fn).listHistory("A-06")).toEqual({ kind: "error" });
    }
    expect(await repo(offline).listHistory("A-06")).toEqual({ kind: "network-error" });
  });
});

describe("postStatus（POST /api/fields/:id/status、T25）", () => {
  it("JSON で入力の 4 項目だけを送る", async () => {
    const { fn, calls } = fakeFetch(() => Response.json(ev, { status: 201 }));
    await repo(fn).postStatus("A-06", input);
    expect(calls[0].url).toBe("/api/fields/A-06/status");
    expect(calls[0].init?.method).toBe("POST");
    expect(new Headers(calls[0].init?.headers).get("content-type")).toBe("application/json");
    expect(JSON.parse(String(calls[0].init?.body))).toStrictEqual({
      status: "ready",
      reasons: ["ear_color"],
      note: null,
      refPhotoIds: ["p1"],
    });
  });

  it("番号は URL の形に直す", async () => {
    const { fn, calls } = fakeFetch(() => Response.json(ev, { status: 201 }));
    await repo(fn).postStatus("A 06", input);
    expect(calls[0].url).toBe("/api/fields/A%2006/status");
  });

  it("201 は残した判断を返す", async () => {
    const { fn } = fakeFetch(() => Response.json(ev, { status: 201 }));
    expect(await repo(fn).postStatus("A-06", input)).toEqual({ kind: "created", event: ev });
  });

  it("201 でも本文が判断でなければ error", async () => {
    for (const body of [null, [], { id: "7" }, "x"]) {
      const { fn } = fakeFetch(() => Response.json(body, { status: 201 }));
      expect(await repo(fn).postStatus("A-06", input)).toEqual({ kind: "error" });
    }
    const broken = fakeFetch(() => new Response("{", { status: 201 }));
    expect(await repo(broken.fn).postStatus("A-06", input)).toEqual({ kind: "error" });
  });

  it("401 は unauthorized", async () => {
    const { fn } = fakeFetch(() => Response.json({ error: "unauthorized" }, { status: 401 }));
    expect(await repo(fn).postStatus("A-06", input)).toEqual({ kind: "unauthorized" });
  });

  it("422 は rejected で、本文の理由のコードを返す（読めなければ null）", async () => {
    const withReason = fakeFetch(() =>
      Response.json({ error: "unprocessable", reason: "ref_photo_not_in_field" }, { status: 422 }),
    );
    expect(await repo(withReason.fn).postStatus("A-06", input)).toEqual({
      kind: "rejected",
      reason: "ref_photo_not_in_field",
    });
    for (const respond of [
      () => new Response("{", { status: 422 }),
      () => Response.json({ error: "unprocessable", reason: 3 }, { status: 422 }),
    ]) {
      expect(await repo(fakeFetch(respond).fn).postStatus("A-06", input)).toEqual({ kind: "rejected", reason: null });
    }
  });

  it("400・413・415（送った形の誤り）も rejected（理由なし）", async () => {
    for (const status of [400, 413, 415]) {
      const { fn } = fakeFetch(() => Response.json({ error: "x" }, { status }));
      expect(await repo(fn).postStatus("A-06", input)).toEqual({ kind: "rejected", reason: null });
    }
  });

  it("500 などは error、つながらなければ network-error", async () => {
    const { fn } = fakeFetch(() => new Response(null, { status: 500 }));
    expect(await repo(fn).postStatus("A-06", input)).toEqual({ kind: "error" });
    expect(await repo(offline).postStatus("A-06", input)).toEqual({ kind: "network-error" });
  });
});

describe("revoke（DELETE /api/status-events/:id、T23）", () => {
  it("DELETE で取り消し、200 の判断を返す", async () => {
    const revoked = { ...ev, revokedAt: "2026-07-22T00:00:00.000Z" };
    const { fn, calls } = fakeFetch(() => Response.json(revoked));
    expect(await repo(fn).revoke(7)).toEqual({ kind: "ok", event: revoked });
    expect(calls[0].url).toBe("/api/status-events/7");
    expect(calls[0].init?.method).toBe("DELETE");
  });

  it("200 でも本文が判断でなければ error", async () => {
    const { fn } = fakeFetch(() => Response.json({ ok: true }));
    expect(await repo(fn).revoke(7)).toEqual({ kind: "error" });
  });

  it("401 は unauthorized、404 は not-found、500 は error、つながらなければ network-error", async () => {
    const cases: [number, string][] = [
      [401, "unauthorized"],
      [404, "not-found"],
      [500, "error"],
    ];
    for (const [status, kind] of cases) {
      const { fn } = fakeFetch(() => Response.json({ error: "x" }, { status }));
      expect(await repo(fn).revoke(7)).toEqual({ kind });
    }
    expect(await repo(offline).revoke(7)).toEqual({ kind: "network-error" });
  });
});
