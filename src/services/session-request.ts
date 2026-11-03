/**
 * POST /api/session の入力の検証（docs/spec.md §6）。例外は出さず、理由のコードを返す。
 * 合言葉は削らず・正規化せず、そのまま照合に渡す。
 */

/** 本文の上限（文字数）。超えたら 413 */
export const SESSION_BODY_MAX_CHARS = 1024;

/** CF-Connecting-IP が無いときに IP の代わりに使う値（IP の無い要求は 1 つの枠を分け合う） */
export const UNKNOWN_IP = "unknown";

export type SessionBodyReason =
  | "too_long"
  | "not_json"
  | "not_object"
  | "unknown_key"
  | "missing_passphrase"
  | "bad_passphrase";

export type SessionBodyResult = { ok: true; passphrase: string } | { ok: false; reason: SessionBodyReason };

/** media type が application/json か（大文字小文字と ; 以降のパラメータは無視） */
export function isJsonContentType(header: string | null): boolean {
  if (header === null) return false;
  return header.split(";")[0].trim().toLowerCase() === "application/json";
}

/** 本文 { passphrase: string } を検証する。他のキーは拒否、空文字は通す */
export function parseSessionBody(text: string): SessionBodyResult {
  // JSON として読む前に長さを見る
  if (text.length > SESSION_BODY_MAX_CHARS) return { ok: false, reason: "too_long" };
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return { ok: false, reason: "not_json" };
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) return { ok: false, reason: "not_object" };
  // in ではなく Object.keys で見る（"__proto__" も自分のキーとして数える）
  const keys = Object.keys(body);
  if (keys.some((key) => key !== "passphrase")) return { ok: false, reason: "unknown_key" };
  if (keys.length === 0) return { ok: false, reason: "missing_passphrase" };
  const passphrase = (body as Record<string, unknown>).passphrase;
  if (typeof passphrase !== "string") return { ok: false, reason: "bad_passphrase" };
  return { ok: true, passphrase };
}

/** CF-Connecting-IP の値。無い・空なら UNKNOWN_IP。X-Forwarded-For は見ない */
export function clientIp(header: string | null): string {
  return header === null || header === "" ? UNKNOWN_IP : header;
}
