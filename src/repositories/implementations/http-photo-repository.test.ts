import { describe, expect, it } from "vitest";
import type { UploadMeta } from "@/types";
import { createHttpPhotoRepository, type FetchLike } from "./http-photo-repository";

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

const meta: UploadMeta = {
  contentHash: "a".repeat(64),
  takenAt: "2026-07-21",
  takenAtSource: "xmp",
  candidateFieldIds: ["A-03", "A-04"],
  chosenFieldId: null,
};

describe("login（POST /api/session）", () => {
  it("合言葉を JSON で送る", async () => {
    const { fn, calls } = fakeFetch(() => new Response(null, { status: 204 }));
    await createHttpPhotoRepository(fn, "https://example.test").login("phrase");
    expect(calls[0].url).toBe("https://example.test/api/session");
    expect(calls[0].init?.method).toBe("POST");
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({ passphrase: "phrase" });
  });

  it.each([
    [204, "ok"],
    [401, "wrong"],
    [429, "too-many"],
    [500, "error"],
  ])("状態 %i は %s", async (status, outcome) => {
    const { fn } = fakeFetch(() => new Response(null, { status }));
    expect(await createHttpPhotoRepository(fn).login("phrase")).toBe(outcome);
  });

  it("つながらなければ network-error", async () => {
    expect(await createHttpPhotoRepository(offline).login("phrase")).toBe("network-error");
  });
});

describe("upload（POST /api/uploads）", () => {
  const image = new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: "image/jpeg" });

  it("画像と meta を multipart で送る。meta は JSON の文字列で、距離・座標は入れない（K6）", async () => {
    const { fn, calls } = fakeFetch(() => Response.json({ id: "p1" }, { status: 201 }));
    await createHttpPhotoRepository(fn).upload(image, meta);
    expect(calls[0].url).toBe("/api/uploads");
    expect(calls[0].init?.method).toBe("POST");
    const form = calls[0].init?.body as FormData;
    expect(form.get("image")).toBeInstanceOf(Blob);
    expect(JSON.parse(String(form.get("meta")))).toEqual(meta);
  });

  it("201 は created と id", async () => {
    const { fn } = fakeFetch(() => Response.json({ id: "p1" }, { status: 201 }));
    expect(await createHttpPhotoRepository(fn).upload(image, meta)).toEqual({ kind: "created", id: "p1" });
  });

  it("409 は duplicate と既にある写真の id", async () => {
    const { fn } = fakeFetch(() => Response.json({ id: "p0" }, { status: 409 }));
    expect(await createHttpPhotoRepository(fn).upload(image, meta)).toEqual({ kind: "duplicate", id: "p0" });
  });

  it.each([
    [401, "unauthorized"],
    [413, "too-large"],
    [415, "rejected"],
    [422, "rejected"],
    [500, "error"],
  ])("状態 %i は %s", async (status, kind) => {
    const { fn } = fakeFetch(() => new Response(null, { status }));
    expect(await createHttpPhotoRepository(fn).upload(image, meta)).toEqual({ kind });
  });

  it("201 なのに id が読めなければ error（成功と見なさない）", async () => {
    const { fn } = fakeFetch(() => new Response("not json", { status: 201 }));
    expect(await createHttpPhotoRepository(fn).upload(image, meta)).toEqual({ kind: "error" });
  });

  it("つながらなければ network-error", async () => {
    expect(await createHttpPhotoRepository(offline).upload(image, meta)).toEqual({ kind: "network-error" });
  });
});

describe("listRecent（GET /api/photos/recent）", () => {
  it("件数を付けて読む", async () => {
    const { fn, calls } = fakeFetch(() => Response.json([]));
    await createHttpPhotoRepository(fn).listRecent(50);
    expect(calls[0].url).toBe("/api/photos/recent?limit=50");
  });

  it("200 は写真の一覧", async () => {
    const photo = {
      id: "p1",
      fieldId: null,
      chosenFieldId: null,
      state: "unconfirmed",
      candidateFieldIds: ["A-03"],
      takenAt: null,
      takenAtSource: "none",
      width: 1600,
      height: 1200,
      uploadedAt: "2026-11-03T01:00:00Z",
      uploaderDevice: "d1",
    };
    const { fn } = fakeFetch(() => Response.json([photo]));
    expect(await createHttpPhotoRepository(fn).listRecent(50)).toEqual({ kind: "ok", photos: [photo] });
  });

  it("配列でない応答は error", async () => {
    const { fn } = fakeFetch(() => Response.json({ photos: [] }));
    expect(await createHttpPhotoRepository(fn).listRecent(50)).toEqual({ kind: "error" });
  });

  it("200 以外は error、つながらなければ network-error", async () => {
    const { fn } = fakeFetch(() => new Response(null, { status: 500 }));
    expect(await createHttpPhotoRepository(fn).listRecent(50)).toEqual({ kind: "error" });
    expect(await createHttpPhotoRepository(offline).listRecent(50)).toEqual({ kind: "network-error" });
  });
});

describe("listFieldPhotos（GET /api/photos?fieldId=。圃場ごとの確定済み）", () => {
  const confirmed = {
    id: "p2",
    fieldId: "A-06",
    chosenFieldId: null,
    state: "confirmed",
    candidateFieldIds: ["A-06"],
    takenAt: "2026-07-21",
    takenAtSource: "xmp",
    width: 1600,
    height: 1200,
    uploadedAt: "2026-11-03T01:00:00.000Z",
    uploaderDevice: "d1",
  };

  it("圃場の番号を付けて読む（番号は URL の形に直す）", async () => {
    const { fn, calls } = fakeFetch(() => Response.json([]));
    await createHttpPhotoRepository(fn).listFieldPhotos("A-06");
    await createHttpPhotoRepository(fn).listFieldPhotos("A 06&x=1");
    expect(calls.map((c) => c.url)).toStrictEqual(["/api/photos?fieldId=A-06", "/api/photos?fieldId=A%2006%26x%3D1"]);
    expect(calls[0].init?.method ?? "GET").toBe("GET");
  });

  it("200 は写真の一覧", async () => {
    const { fn } = fakeFetch(() => Response.json([confirmed]));
    expect(await createHttpPhotoRepository(fn).listFieldPhotos("A-06")).toEqual({ kind: "ok", photos: [confirmed] });
  });

  it("配列でない応答・読めない本文は error", async () => {
    const { fn } = fakeFetch(() => Response.json({ photos: [] }));
    expect(await createHttpPhotoRepository(fn).listFieldPhotos("A-06")).toEqual({ kind: "error" });
    const broken = fakeFetch(() => new Response("{", { status: 200 }));
    expect(await createHttpPhotoRepository(broken.fn).listFieldPhotos("A-06")).toEqual({ kind: "error" });
  });

  it("400（一覧に無い番号）・500 は error、つながらなければ network-error", async () => {
    for (const status of [400, 500]) {
      const { fn } = fakeFetch(() => Response.json({ error: "bad_request" }, { status }));
      expect(await createHttpPhotoRepository(fn).listFieldPhotos("A-99")).toEqual({ kind: "error" });
    }
    expect(await createHttpPhotoRepository(offline).listFieldPhotos("A-06")).toEqual({ kind: "network-error" });
  });
});

describe("getRole（GET /api/session。この端末の役割）", () => {
  it("GET で読む", async () => {
    const { fn, calls } = fakeFetch(() => Response.json({ role: "admin" }));
    await createHttpPhotoRepository(fn, "https://example.test").getRole();
    expect(calls[0].url).toBe("https://example.test/api/session");
    expect(calls[0].init?.method ?? "GET").toBe("GET");
  });

  it.each(["member", "admin"])("200 {role: %s} はその役割", async (role) => {
    const { fn } = fakeFetch(() => Response.json({ role }));
    expect(await createHttpPhotoRepository(fn).getRole()).toEqual({ kind: "ok", role });
  });

  it("401 はまだ入っていない（role が null）", async () => {
    const { fn } = fakeFetch(() => Response.json({ error: "unauthorized" }, { status: 401 }));
    expect(await createHttpPhotoRepository(fn).getRole()).toEqual({ kind: "ok", role: null });
  });

  it.each([{ role: "owner" }, { role: null }, {}, ["admin"]])("知らない形の本文 %j は error（管理者と見なさない）", async (body) => {
    const { fn } = fakeFetch(() => Response.json(body));
    expect(await createHttpPhotoRepository(fn).getRole()).toEqual({ kind: "error" });
  });

  it("JSON でなければ error、他の状態は error、つながらなければ network-error", async () => {
    expect(await createHttpPhotoRepository(fakeFetch(() => new Response("admin")).fn).getRole()).toEqual({
      kind: "error",
    });
    expect(
      await createHttpPhotoRepository(fakeFetch(() => new Response(null, { status: 500 })).fn).getRole(),
    ).toEqual({ kind: "error" });
    expect(await createHttpPhotoRepository(offline).getRole()).toEqual({ kind: "network-error" });
  });
});

describe("assign（PATCH /api/photos/:id/assignment）", () => {
  it("番号を JSON で送る。写真の id は URL の中で符号化する", async () => {
    const { fn, calls } = fakeFetch(() => Response.json({}));
    await createHttpPhotoRepository(fn, "https://example.test").assign("p/1?x", "A-06");
    expect(calls[0].url).toBe("https://example.test/api/photos/p%2F1%3Fx/assignment");
    expect(calls[0].init?.method).toBe("PATCH");
    expect(new Headers(calls[0].init?.headers).get("Content-Type")).toBe("application/json");
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({ fieldId: "A-06" });
  });

  it.each([
    [200, "ok"],
    [401, "unauthorized"],
    [403, "forbidden"],
    [404, "not-found"],
    [422, "rejected"],
    [500, "error"],
    [204, "error"],
  ])("状態 %i は %s", async (status, outcome) => {
    const { fn } = fakeFetch(() => new Response(status === 204 ? null : "{}", { status }));
    expect(await createHttpPhotoRepository(fn).assign("p1", "A-06")).toBe(outcome);
  });

  it("つながらなければ network-error", async () => {
    expect(await createHttpPhotoRepository(offline).assign("p1", "A-06")).toBe("network-error");
  });
});
