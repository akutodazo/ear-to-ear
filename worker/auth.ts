/**
 * Cookie の検証と、経路の auth による 401・403 の出し分け。
 */
import type { SessionClaims } from "@/services/session-token";
import type { AuthLevel, Deps, RouteContext } from "./deps";

export type AuthResult =
  | { kind: "anonymous" }
  | { kind: "invalid" }
  | { kind: "ok"; claims: SessionClaims };

export type AuthDecision =
  | { ok: true; session: SessionClaims | null }
  | { ok: false; status: 401 | 403 };

/** Cookie を読んで verifySessionToken で確かめる。hmac の例外は握らない */
export async function authenticate(_request: Request, _deps: Deps): Promise<AuthResult> {
  throw new Error("not implemented");
}

/** none は常に通して session は null。member は member・admin、admin は admin だけ */
export function authorize(_level: AuthLevel, _result: AuthResult): AuthDecision {
  throw new Error("not implemented");
}

/** member・admin の経路のハンドラが session を取る。null なら例外（500） */
export function requireSession(_ctx: RouteContext): SessionClaims {
  throw new Error("not implemented");
}
