import { describe, expect, it } from "vitest";
import { health, notImplemented, routes } from "./routes";

describe("経路の表（docs/spec.md §6 の L0）", () => {
  it("メソッド・パス・認証の組が仕様どおり", () => {
    expect(routes.map(({ method, pattern, auth }) => [method, pattern, auth])).toEqual([
      ["GET", "/api/health", "none"],
      ["POST", "/api/session", "none"],
      ["POST", "/api/uploads", "member"],
      ["GET", "/api/photos", "none"],
      ["GET", "/api/photos/recent", "none"],
      ["GET", "/api/photo-files/:id", "none"],
      ["PATCH", "/api/photos/:id/assignment", "admin"],
      ["GET", "/api/session", "member"],
    ]);
  });
});

describe("health", () => {
  it("200 で { ok: true } だけ", async () => {
    const response = await health();
    expect(response.status).toBe(200);
    expect(await response.json()).toStrictEqual({ ok: true });
  });
});

describe("notImplemented", () => {
  it("501 で { error: not_implemented }", async () => {
    const response = await notImplemented();
    expect(response.status).toBe(501);
    expect(await response.json()).toStrictEqual({ error: "not_implemented" });
  });
});
