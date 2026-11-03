/**
 * Cookie の検証と、経路の auth による 401・403 の出し分け。
 */
import { verifySessionToken, type SessionClaims } from "@/services/session-token";
import { readCookie, SESSION_COOKIE_NAME } from "./cookies";
import type { AuthLevel, Deps, RouteContext } from "./deps";

export type AuthResult =
  | { kind: "anonymous" }
  | { kind: "invalid" }
  | { kind: "ok"; claims: SessionClaims };

export type AuthDecision =
  | { ok: true; session: SessionClaims | null }
  | { ok: false; status: 401 | 403 };

/** Cookie を読んで verifySessionToken で確かめる。hmac の例外は握らない */
export async function authenticate(request: Request, deps: Deps): Promise<AuthResult> {
  const token = readCookie(request.headers.get("cookie"), SESSION_COOKIE_NAME);
  if (token === null) return { kind: "anonymous" };
  // deps.nowMs はミリ秒。秒に直すのはここだけ
  const nowSec = Math.floor(deps.nowMs() / 1000);
  const claims = await verifySessionToken(token, deps.hmac, nowSec);
  return claims === null ? { kind: "invalid" } : { kind: "ok", claims };
}

/** none は常に通して session は null。member は member・admin、admin は admin だけ */
export function authorize(level: AuthLevel, result: AuthResult): AuthDecision {
  if (level === "none") return { ok: true, session: null };
  if (result.kind !== "ok") return { ok: false, status: 401 };
  if (level === "admin" && result.claims.role !== "admin") return { ok: false, status: 403 };
  return { ok: true, session: result.claims };
}

/** member・admin の経路のハンドラが session を取る。null なら例外（500） */
export function requireSession(ctx: RouteContext): SessionClaims {
  if (ctx.session === null) throw new Error("session が無い（経路の auth が none のまま使っている）");
  return ctx.session;
}
