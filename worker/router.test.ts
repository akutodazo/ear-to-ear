import { describe, expect, it } from "vitest";
import type { Handler, Route } from "./deps";
import { matchRoute } from "./router";
import { routes } from "./routes";

const handler: Handler = async () => new Response(null);

function find(method: string, pathname: string) {
  return matchRoute(routes, method, pathname);
}

describe("一致", () => {
  it.each([
    ["GET", "/api/health"],
    ["POST", "/api/session"],
    ["GET", "/api/session"],
    ["POST", "/api/uploads"],
    ["GET", "/api/photos"],
    ["GET", "/api/photos/recent"],
    ["GET", "/api/photo-files/abc"],
    ["PATCH", "/api/photos/abc/assignment"],
  ])("%s %s は表の経路に一致する", (method, pathname) => {
    const match = find(method, pathname);
    expect(match.kind).toBe("found");
  });

  it(":id の値が params に入る", () => {
    const match = find("GET", "/api/photo-files/photo-1");
    expect(match).toMatchObject({ kind: "found", params: { id: "photo-1" } });
    if (match.kind === "found") expect(match.route.pattern).toBe("/api/photo-files/:id");
  });

  it("/api/photos/recent は /api/photos/:id/assignment や他の :id に食われない", () => {
    const match = find("GET", "/api/photos/recent");
    expect(match).toMatchObject({ kind: "found", params: {} });
    if (match.kind === "found") expect(match.route.pattern).toBe("/api/photos/recent");
  });

  it("表の上から最初に一致した経路を使う", () => {
    const table: Route[] = [
      { method: "GET", pattern: "/api/a/:x", auth: "none", handler },
      { method: "GET", pattern: "/api/a/b", auth: "admin", handler },
    ];
    const match = matchRoute(table, "GET", "/api/a/b");
    expect(match).toMatchObject({ kind: "found", params: { x: "b" } });
    if (match.kind === "found") expect(match.route.auth).toBe("none");
  });

  it("パラメータは復号しない（%2F は 1 つの値に残る）", () => {
    expect(find("GET", "/api/photo-files/a%2Fb")).toMatchObject({
      kind: "found",
      params: { id: "a%2Fb" },
    });
  });
});

describe("一致しない", () => {
  it.each([
    ["末尾のスラッシュ", "/api/photos/recent/"],
    ["大文字", "/API/photos"],
    ["空の区切り", "/api//photos"],
    ["/api 単独", "/api"],
    ["/api/ 単独", "/api/"],
    ["空の :id", "/api/photo-files/"],
    ["区切りが多い", "/api/photo-files/a/b"],
    ["表に無い", "/api/fields"],
  ])("%s は not-found", (_name, pathname) => {
    expect(find("GET", pathname)).toEqual({ kind: "not-found" });
  });

  it("パスは合うがメソッドが違うと method-not-allowed で、Allow に表のメソッド", () => {
    expect(find("DELETE", "/api/session")).toEqual({ kind: "method-not-allowed", allow: ["POST", "GET"] });
  });

  it("複数のメソッドがあれば Allow は表の順", () => {
    const table: Route[] = [
      { method: "POST", pattern: "/api/x", auth: "none", handler },
      { method: "GET", pattern: "/api/x", auth: "none", handler },
    ];
    expect(matchRoute(table, "DELETE", "/api/x")).toEqual({
      kind: "method-not-allowed",
      allow: ["POST", "GET"],
    });
  });

  it.each(["HEAD", "OPTIONS", "get"])("%s は特別扱いしない（method-not-allowed）", (method) => {
    expect(find(method, "/api/photos").kind).toBe("method-not-allowed");
  });
});

describe("固定の区切りは全部の文字で比べる（攻撃役の指摘）", () => {
  it.each([
    ["GET", "/api/phones"],
    ["GET", "/api/hxxxxx"],
    ["GET", "/api/photos/recenx"],
    ["GET", "/api/photo-filex/abc"],
    ["POST", "/api/sessiom"],
    ["POST", "/api/uploadz"],
    ["PATCH", "/api/photos/abc/assignmenx"],
    ["PATCH", "/api/photoz/abc/assignment"],
  ])("%s %s は not-found", (method, pathname) => {
    expect(find(method, pathname)).toEqual({ kind: "not-found" });
  });
});
