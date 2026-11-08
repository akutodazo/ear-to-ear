import { describe, expect, it, vi } from "vitest";
import { handleRequest } from "./app";
import type { Deps } from "./deps";
import { fakeDeps, request, sessionToken } from "./test-helpers";

async function call(method: string, path: string, cookie?: string, deps: Deps = fakeDeps()) {
  return handleRequest(request(method, path, cookie), deps);
}

describe("/api/ の外は静的アセット", () => {
  it.each(["/", "/recent", "/upload", "/apix", "/fields/A-01"])("%s は assets に渡り、応答はそのまま", async (path) => {
    const response = await call("GET", path);
    expect(await response.text()).toBe(`asset:${path}`);
    expect(response.headers.get("x-asset")).toBe("1");
    expect(response.headers.get("cache-control")).toBeNull();
  });

  it("assets の例外は 500 で中身を漏らさない", async () => {
    const deps = fakeDeps({
      assets: async () => {
        throw new Error("secret-detail");
      },
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await call("GET", "/", undefined, deps);
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("secret-detail");
  });
});

describe("/api/", () => {
  it("health は 200 { ok: true } と共通ヘッダ", async () => {
    const response = await call("GET", "/api/health");
    expect(response.status).toBe(200);
    expect(await response.json()).toStrictEqual({ ok: true });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });

  // T22 で 501 の経路が無くなったので、認証なしの経路は health で確かめる
  it("認証なしの経路は壊れた Cookie を読まない（401 にならない）", async () => {
    const response = await call("GET", "/api/health", "session=broken");
    expect(response.status).toBe(200);
  });

  it("クエリ付きでも経路に一致する", async () => {
    expect((await call("GET", "/api/health?fieldId=A-01")).status).toBe(200);
  });

  it("GET /api/photos は番号が無ければ 400（501 ではない。T22）", async () => {
    const response = await call("GET", "/api/photos");
    expect(response.status).toBe(400);
    expect(await response.json()).toStrictEqual({ error: "bad_request" });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("無い経路は 404 { error: not_found }（Cookie が無くても認証より先）", async () => {
    const response = await call("POST", "/api/nothing");
    expect(response.status).toBe(404);
    expect(await response.json()).toStrictEqual({ error: "not_found" });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it.each(["/api", "/api/"])("%s 単独は 404", async (path) => {
    expect((await call("GET", path)).status).toBe(404);
  });

  it("メソッド違いは 405 と Allow（表の順）と共通ヘッダ", async () => {
    // DELETE は出る（11-08）に使うので、メソッド違いの例は PATCH
    const response = await call("PATCH", "/api/session");
    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("POST, GET, DELETE");
    expect(await response.json()).toStrictEqual({ error: "method_not_allowed" });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("admin の経路のメソッド違いは、Cookie が無くても 405（認証より先）", async () => {
    expect((await call("GET", "/api/photos/p1/assignment")).status).toBe(405);
  });
});

describe("認証", () => {
  it("member の経路は Cookie が無いと 401", async () => {
    const response = await call("POST", "/api/uploads");
    expect(response.status).toBe(401);
    expect(await response.json()).toStrictEqual({ error: "unauthorized" });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it.each(["member", "admin"] as const)("member の経路は %s なら通る（本文が無いので 415）", async (role) => {
    expect((await call("POST", "/api/uploads", `session=${await sessionToken(role)}`)).status).toBe(415);
  });

  it("admin の経路は member だと 403", async () => {
    const response = await call("PATCH", "/api/photos/p1/assignment", `session=${await sessionToken("member")}`);
    expect(response.status).toBe(403);
    expect(await response.json()).toStrictEqual({ error: "forbidden" });
  });

  it("admin の経路は admin なら通る（本文が無いので 415。Issue #78 で 501 から変わった）", async () => {
    const cookie = `session=${await sessionToken("admin")}`;
    expect((await call("PATCH", "/api/photos/p1/assignment", cookie)).status).toBe(415);
  });

  it("hmac の例外は 500 で中身を漏らさない", async () => {
    const deps = fakeDeps({
      hmac: async () => {
        throw new Error("secret-detail");
      },
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const cookie = `session=${await sessionToken("member")}`;
    const response = await call("POST", "/api/uploads", cookie, deps);
    expect(response.status).toBe(500);
    const text = await response.text();
    expect(JSON.parse(text)).toStrictEqual({ error: "internal" });
    expect(text).not.toContain("secret-detail");
  });
});

describe("ハンドラの例外", () => {
  it("ハンドラが投げても 500 { error: internal } で、message は漏らさない", async () => {
    const routesModule = await import("./routes");
    const spy = vi.spyOn(routesModule.routes[1], "handler").mockImplementation(async () => {
      throw new Error("secret-detail");
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await call("POST", "/api/session");
    spy.mockRestore();
    expect(response.status).toBe(500);
    const text = await response.text();
    expect(JSON.parse(text)).toStrictEqual({ error: "internal" });
    expect(text).not.toContain("secret-detail");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});

describe("見えない動き（攻撃役の指摘）", () => {
  it("認証なしの経路は Cookie があっても hmac を呼ばない", async () => {
    const hmac = vi.fn(fakeDeps().hmac);
    const cookie = `session=${await sessionToken("member")}`;
    await call("GET", "/api/photos/recent", cookie, fakeDeps({ hmac }));
    expect(hmac).not.toHaveBeenCalled();
  });

  it("member の経路では hmac を 1 回呼ぶ", async () => {
    const hmac = vi.fn(fakeDeps().hmac);
    const cookie = `session=${await sessionToken("member")}`;
    await call("POST", "/api/uploads", cookie, fakeDeps({ hmac }));
    expect(hmac).toHaveBeenCalledTimes(1);
  });

  it("500 のときは console.error に残す", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const deps = fakeDeps({
      assets: async () => {
        throw new Error("boom");
      },
    });
    await call("GET", "/", undefined, deps);
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });

  it("ハンドラに url・params・session・deps を渡す", async () => {
    const routesModule = await import("./routes");
    const route = routesModule.routes[6];
    const deps = fakeDeps();
    let seen: unknown;
    const spy = vi.spyOn(route, "handler").mockImplementation(async (_request, ctx) => {
      seen = ctx;
      return new Response(null, { status: 204 });
    });
    const cookie = `session=${await sessionToken("admin")}`;
    const response = await call("PATCH", "/api/photos/p-9/assignment?x=1", cookie, deps);
    spy.mockRestore();
    expect(response.status).toBe(204);
    expect(seen).toMatchObject({
      params: { id: "p-9" },
      session: { device: "dev-admin", role: "admin" },
      deps,
    });
    const ctx = seen as { url: URL };
    expect(ctx.url.pathname).toBe("/api/photos/p-9/assignment");
    expect(ctx.url.searchParams.get("x")).toBe("1");
  });

  it("認証なしの経路のハンドラには session: null を渡す", async () => {
    const routesModule = await import("./routes");
    const route = routesModule.routes[4];
    let seen: unknown;
    const spy = vi.spyOn(route, "handler").mockImplementation(async (_request, ctx) => {
      seen = ctx;
      return new Response(null, { status: 204 });
    });
    await call("GET", "/api/photos/recent", `session=${await sessionToken("admin")}`);
    spy.mockRestore();
    expect(seen).toMatchObject({ session: null, params: {} });
  });
});
