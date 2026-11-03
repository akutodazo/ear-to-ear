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
  void header;
  throw new Error("not implemented");
}

/** 本文 { passphrase: string } を検証する。他のキーは拒否、空文字は通す */
export function parseSessionBody(text: string): SessionBodyResult {
  void text;
  throw new Error("not implemented");
}

/** CF-Connecting-IP の値。無い・空なら UNKNOWN_IP。X-Forwarded-For は見ない */
export function clientIp(header: string | null): string {
  void header;
  throw new Error("not implemented");
}
