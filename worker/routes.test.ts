import { describe, expect, it } from "vitest";
import { postFieldStatus } from "./field-status";
import { getFieldsSummary } from "./fields";
import { getPhotosByField } from "./photos";
import { health, notImplemented, routes } from "./routes";
import { deleteStatusEvent } from "./status-events";
import { getFieldStatusEvents } from "./status-history";

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
      ["DELETE", "/api/status-events/:id", "member"],
      ["GET", "/api/fields/summary", "none"],
      ["POST", "/api/fields/:id/status", "member"],
      ["GET", "/api/fields/:id/status-events", "none"],
    ]);
  });

  it("DELETE /api/status-events/:id は deleteStatusEvent（T23）", () => {
    expect(routes.find((r) => r.method === "DELETE" && r.pattern === "/api/status-events/:id")?.handler).toBe(
      deleteStatusEvent,
    );
  });

  it("GET /api/fields/summary は getFieldsSummary（T24）", () => {
    expect(routes.find((r) => r.method === "GET" && r.pattern === "/api/fields/summary")?.handler).toBe(getFieldsSummary);
  });

  it("POST /api/fields/:id/status は postFieldStatus（T25）", () => {
    expect(routes.find((r) => r.method === "POST" && r.pattern === "/api/fields/:id/status")?.handler).toBe(postFieldStatus);
  });

  it("GET /api/fields/:id/status-events は getFieldStatusEvents（T26）", () => {
    expect(routes.find((r) => r.method === "GET" && r.pattern === "/api/fields/:id/status-events")?.handler).toBe(
      getFieldStatusEvents,
    );
  });

  it("GET /api/photos は getPhotosByField（T22。501 の経路は無い）", () => {
    expect(routes.find((r) => r.method === "GET" && r.pattern === "/api/photos")?.handler).toBe(getPhotosByField);
    expect(routes.some((r) => r.handler === notImplemented)).toBe(false);
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
