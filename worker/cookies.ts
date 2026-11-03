/**
 * セッションの Cookie の読み書き（docs/spec.md §6）。
 */
export const SESSION_COOKIE_NAME = "session";

/** Cookie ヘッダから名前で値を取る。同名は最初。無い・空は null。値は復号しない */
export function readCookie(_header: string | null, _name: string): string | null {
  throw new Error("not implemented");
}

/** session=<token>; Path=/; Max-Age=<SESSION_DAYS の秒>; HttpOnly; Secure; SameSite=Lax */
export function buildSessionCookie(_token: string): string {
  throw new Error("not implemented");
}
