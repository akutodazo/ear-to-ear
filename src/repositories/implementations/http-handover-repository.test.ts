import { describe, expect, it } from "vitest";
import type { HandoverNote } from "@/types";
import type { CreateHandoverOutcome } from "@/repositories/interfaces/i-handover-repository";
import { createHttpHandoverRepository } from "./http-handover-repository";
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

const repo = (fn: FetchLike, baseUrl?: string) => createHttpHandoverRepository(fn, baseUrl);

const note: HandoverNote = {
  fieldId: "A-06",
  season: "2026",
  records: [
    { kind: "photo", id: "p1", text: "[写真] 2026-07-20 撮影。判断 7 の根拠。" },
    { kind: "status", id: "7", text: "[判断 7] 2026-07-21 収穫可能。理由: 穂の色。根拠の写真: 1 枚。" },
  ],
  blocks: [
    { text: "7/21 に収穫可能と判断した。", cites: [{ start: 1, end: 2, citedText: "収穫可能" }] },
    { text: "来年も穂の色を見る。", cites: [] },
  ],
  model: "claude-sonnet-5-5",
  createdAt: "2026-07-22T00:00:00.000Z",
};

/** メモの形でない本文（いずれも error） */
const notNotes: unknown[] = [
  null,
  [],
  "note",
  { ...note, blocks: undefined },
  { ...note, blocks: {} },
  { ...note, records: undefined },
  { ...note, records: "r" },
  { ...note, fieldId: 6 },
];

describe("getNote（GET /api/fields/:id/handover）", () => {
  it("認証なしの GET で読み、200 のメモを返す", async () => {
    const { fn, calls } = fakeFetch(() => Response.json(note));
    expect(await repo(fn).getNote("A-06")).toEqual({ kind: "ok", note });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("/api/fields/A-06/handover");
    expect(calls[0].init?.method ?? "GET").toBe("GET");
  });

  it("圃場の番号は URL の中で符号化し、baseUrl を前に付ける", async () => {
    const { fn, calls } = fakeFetch(() => Response.json(note));
    await repo(fn, "https://x.test").getNote("A/06?");
    expect(calls[0].url).toBe("https://x.test/api/fields/A%2F06%3F/handover");
  });

  it("404 は none（今のシーズンのメモが無い）", async () => {
    const { fn } = fakeFetch(() => Response.json({ error: "not_found" }, { status: 404 }));
    expect(await repo(fn).getNote("A-06")).toEqual({ kind: "none" });
  });

  it("メモの形でない・本文が読めない・200 と 404 以外は error", async () => {
    for (const body of notNotes) {
      expect(await repo(fakeFetch(() => Response.json(body)).fn).getNote("A-06")).toEqual({ kind: "error" });
    }
    for (const respond of [
      () => new Response("{", { status: 200 }),
      () => Response.json(note, { status: 500 }),
      () => Response.json(note, { status: 201 }),
      () => Response.json({ error: "bad_request" }, { status: 400 }),
    ]) {
      expect(await repo(fakeFetch(respond).fn).getNote("A-06")).toEqual({ kind: "error" });
    }
  });

  it("つながらなければ network-error", async () => {
    expect(await repo(offline).getNote("A-06")).toEqual({ kind: "network-error" });
  });
});

describe("createNote（POST /api/fields/:id/handover）", () => {
  it("本文なしの POST を送り、200 のメモを created で返す", async () => {
    const { fn, calls } = fakeFetch(() => Response.json(note));
    expect(await repo(fn).createNote("A-06")).toEqual({ kind: "created", note });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("/api/fields/A-06/handover");
    expect(calls[0].init?.method).toBe("POST");
    expect(calls[0].init?.body ?? null).toBeNull();
  });

  it("圃場の番号は URL の中で符号化し、baseUrl を前に付ける", async () => {
    const { fn, calls } = fakeFetch(() => Response.json(note));
    await repo(fn, "https://x.test").createNote("A/06?");
    expect(calls[0].url).toBe("https://x.test/api/fields/A%2F06%3F/handover");
  });

  it("状態ごとに読み分ける（本文の中身に頼らない）", async () => {
    const cases: [number, CreateHandoverOutcome][] = [
      [401, { kind: "unauthorized" }],
      [403, { kind: "forbidden" }],
      [404, { kind: "not-found" }],
      [422, { kind: "no-records" }],
      [429, { kind: "usage-limit" }],
      [502, { kind: "upstream-error" }],
      [400, { kind: "error" }],
      [500, { kind: "error" }],
      [503, { kind: "disabled" }],
      [504, { kind: "error" }],
      [201, { kind: "error" }],
    ];
    for (const [status, expected] of cases) {
      const { fn } = fakeFetch(() => Response.json({ error: "x" }, { status }));
      expect(await repo(fn).createNote("A-06")).toEqual(expected);
    }
  });

  it("200 でもメモの形でない・本文が読めなければ error", async () => {
    for (const body of notNotes) {
      expect(await repo(fakeFetch(() => Response.json(body)).fn).createNote("A-06")).toEqual({ kind: "error" });
    }
    expect(await repo(fakeFetch(() => new Response("{", { status: 200 })).fn).createNote("A-06")).toEqual({
      kind: "error",
    });
  });

  it("つながらなければ network-error", async () => {
    expect(await repo(offline).createNote("A-06")).toEqual({ kind: "network-error" });
  });
});
