/**
 * Worker の振り分けの本体。/api/ の外は静的アセットへ、/api/ は経路・認証・ハンドラ・共通ヘッダ。
 * 未捕捉の例外は 500 { error: "internal" } にして中身を漏らさない。
 */
import { authenticate, authorize, type AuthResult } from "./auth";
import type { Deps } from "./deps";
import { applyCommonHeaders, errorResponse } from "./http";
import { matchRoute } from "./router";
import { routes } from "./routes";

function isApiPath(pathname: string): boolean {
  return pathname === "/api" || pathname.startsWith("/api/");
}

async function handleApi(request: Request, url: URL, deps: Deps): Promise<Response> {
  // 404 と 405 は認証より先
  const match = matchRoute(routes, request.method, url.pathname);
  if (match.kind === "not-found") return errorResponse(404, "not_found");
  if (match.kind === "method-not-allowed") {
    const response = errorResponse(405, "method_not_allowed");
    response.headers.set("allow", match.allow.join(", "));
    return response;
  }

  const { route, params } = match;
  // auth が none の経路は Cookie を読まない（hmac を呼ばない）
  const result: AuthResult =
    route.auth === "none" ? { kind: "anonymous" } : await authenticate(request, deps);
  const decision = authorize(route.auth, result);
  if (!decision.ok) {
    return errorResponse(decision.status, decision.status === 401 ? "unauthorized" : "forbidden");
  }
  return route.handler(request, { url, params, session: decision.session, deps });
}

export async function handleRequest(request: Request, deps: Deps): Promise<Response> {
  try {
    const url = new URL(request.url);
    if (!isApiPath(url.pathname)) return await deps.assets(request);
    return applyCommonHeaders(await handleApi(request, url, deps));
  } catch (error) {
    console.error(error);
    return applyCommonHeaders(errorResponse(500, "internal"));
  }
}
