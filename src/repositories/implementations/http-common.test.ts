import { describe, expect, it } from "vitest";
import { readJson, send, type FetchLike } from "./http-common";

describe("send", () => {
  it("応答をそのまま返し、URL と init を fetch に渡す", async () => {
    const calls: [string, RequestInit | undefined][] = [];
    const response = new Response("ok", { status: 201 });
    const fetchFn: FetchLike = async (url, init) => {
      calls.push([url, init]);
      return response;
    };
    const init = { method: "POST" };
    expect(await send(fetchFn, "/api/x", init)).toBe(response);
    expect(calls).toEqual([["/api/x", init]]);
  });

  it("fetch そのものが失敗したら null（例外にしない）", async () => {
    const offline: FetchLike = async () => {
      throw new TypeError("Failed to fetch");
    };
    expect(await send(offline, "/api/x")).toBeNull();
  });
});

describe("readJson", () => {
  it.each([
    ['{"id":"p1"}', { id: "p1" }],
    ["[1,2]", [1, 2]],
    ["null", null],
    ['"admin"', "admin"],
  ])("JSON の本文 %s はその値", async (body, expected) => {
    expect(await readJson(new Response(body))).toEqual(expected);
  });

  it.each([["not json"], [""], ['{"id":']])("JSON でない本文 %j は undefined（例外にしない）", async (body) => {
    expect(await readJson(new Response(body))).toBeUndefined();
  });

  it("本文を一度読んだ応答（読み直せない）も undefined", async () => {
    const response = new Response("{}");
    await response.text();
    expect(await readJson(response)).toBeUndefined();
  });
});
