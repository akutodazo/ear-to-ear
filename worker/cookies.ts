/**
 * セッションの Cookie の読み書き（docs/spec.md §6）。
 */
import { SESSION_DAYS } from "@/config";

export const SESSION_COOKIE_NAME = "session";

/** Cookie ヘッダから名前で値を取る。同名は最初。無い・空は null。値は復号しない */
export function readCookie(header: string | null, name: string): string | null {
  if (header === null) return null;
  for (const pair of header.split(";")) {
    const index = pair.indexOf("=");
    if (index === -1) continue;
    if (pair.slice(0, index).trim() !== name) continue;
    const value = pair.slice(index + 1).trim();
    return value === "" ? null : value;
  }
  return null;
}

/** session=<token>; Path=/; Max-Age=<SESSION_DAYS の秒>; HttpOnly; Secure; SameSite=Lax */
export function buildSessionCookie(token: string): string {
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  return `${SESSION_COOKIE_NAME}=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}
