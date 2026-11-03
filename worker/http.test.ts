import { describe, expect, it } from "vitest";
import { applyCommonHeaders, errorResponse, json, noContent } from "./http";

describe("json", () => {
  it("状態・Content-Type・本文", async () => {
    const response = json(201, { id: "photo-1" });
    expect(response.status).toBe(201);
    expect(response.headers.get("content-type")).toBe("application/json; charset=utf-8");
    expect(await response.json()).toEqual({ id: "photo-1" });
  });

  it("配列はそのまま（包まない）", async () => {
    expect(await json(200, [1, 2]).json()).toEqual([1, 2]);
  });
});

describe("noContent", () => {
  it("204 で本文も Content-Type も無い", async () => {
    const response = noContent();
    expect(response.status).toBe(204);
    expect(response.headers.get("content-type")).toBeNull();
    expect(await response.text()).toBe("");
  });
});

describe("errorResponse", () => {
  it("本文は { error } だけ", async () => {
    const response = errorResponse(404, "not_found");
    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toBe("application/json; charset=utf-8");
    expect(await response.json()).toStrictEqual({ error: "not_found" });
  });

  it("reason を渡したときだけ載る", async () => {
    expect(await errorResponse(422, "bad_request", { reason: "unknown_key" }).json()).toStrictEqual({
      error: "bad_request",
      reason: "unknown_key",
    });
  });
});

describe("applyCommonHeaders", () => {
  it("無いときに no-store と nosniff を付ける", () => {
    const response = applyCommonHeaders(json(200, {}));
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("ハンドラが付けた値は上書きしない", () => {
    const original = new Response("x", { headers: { "cache-control": "private, max-age=60" } });
    expect(applyCommonHeaders(original).headers.get("cache-control")).toBe("private, max-age=60");
  });

  it("状態と本文は変えない", async () => {
    const response = applyCommonHeaders(errorResponse(401, "unauthorized"));
    expect(response.status).toBe(401);
    expect(await response.json()).toStrictEqual({ error: "unauthorized" });
  });
});

describe("共通ヘッダと本文の細部（攻撃役の指摘）", () => {
  it("すでにある X-Content-Type-Options は上書きしない", () => {
    const original = new Response("x", { headers: { "x-content-type-options": "custom" } });
    expect(applyCommonHeaders(original).headers.get("x-content-type-options")).toBe("custom");
  });

  it.each([
    ["null", null, "null"],
    ["文字列", "abc", '"abc"'],
    ["数", 0, "0"],
  ])("json に %s を渡すと JSON の本文", async (_name, body, text) => {
    expect(await json(200, body).text()).toBe(text);
  });

  it("reason が空文字でも載せる（渡したときだけ載る）", async () => {
    expect(await errorResponse(422, "bad_request", { reason: "" }).json()).toStrictEqual({
      error: "bad_request",
      reason: "",
    });
  });
});
