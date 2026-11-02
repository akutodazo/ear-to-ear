/**
 * 合言葉で入った端末に渡す Cookie の値（docs/spec.md §6 API）。
 * 形は base64url(JSON{device, role, exp}).base64url(HMAC-SHA256)。
 * HMAC は引数で受け取る（Worker では crypto.subtle、テストでは node:crypto）。
 */
import { SESSION_DAYS } from "../config";
import type { Role } from "@/types";

/** 秘密の鍵を閉じ込めた HMAC-SHA256。data は Cookie の前半（base64url の文字列） */
export type Hmac = (data: string) => Promise<Uint8Array>;

export interface SessionClaims {
  /** ログインのたびに新しく作る端末 ID */
  device: string;
  role: Role;
  /** 期限（Unix 秒）。now < exp のあいだ有効 */
  exp: number;
}

function encodeBase64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

export async function issueSessionToken(claims: SessionClaims, hmac: Hmac): Promise<string> {
  // 余分な項目を入れない。キーの順も固定する
  const { device, role, exp } = claims;
  const json = JSON.stringify({ device, role, exp });
  const payload = encodeBase64url(new TextEncoder().encode(json));
  return `${payload}.${encodeBase64url(await hmac(payload))}`;
}

/** 余白や = を含まない base64url だけを通す（atob は空白を読み飛ばし、前半は署名の対象そのものなので形を揃える） */
const BASE64URL = /^[A-Za-z0-9_-]+$/;

/** 長さが同じなら、どこで違っても最後まで比べる（違う位置から署名を推測させない） */
function equalsConstantTime(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function decodeBase64url(text: string): string | null {
  const base64 = text.replaceAll("-", "+").replaceAll("_", "/");
  try {
    const binary = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

/** 正しければ中身を返す。改ざん・期限切れ・形の崩れは null */
export async function verifySessionToken(
  token: string,
  hmac: Hmac,
  nowSec: number,
): Promise<SessionClaims | null> {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;
  if (!BASE64URL.test(payload) || !BASE64URL.test(signature)) return null;

  // 署名は文字列として比べる（末尾の使われないビットだけ違う署名も通さない）
  if (!equalsConstantTime(signature, encodeBase64url(await hmac(payload)))) return null;

  const json = decodeBase64url(payload);
  if (json === null) return null;
  let body: unknown;
  try {
    body = JSON.parse(json);
  } catch {
    return null;
  }
  return toClaims(body, nowSec);
}

const ROLES: readonly Role[] = ["member", "admin"];
const MAX_SESSION_SEC = SESSION_DAYS * 24 * 60 * 60;

/** 署名が正しくても中身を確かめる。返すのは device・role・exp だけ */
function toClaims(body: unknown, nowSec: number): SessionClaims | null {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return null;
  const { device, role, exp } = body as Record<string, unknown>;
  if (typeof device !== "string" || device === "") return null;
  const knownRole = ROLES.find((r) => r === role);
  if (knownRole === undefined) return null;
  if (typeof exp !== "number" || !Number.isInteger(exp)) return null;
  if (!(nowSec < exp)) return null;
  // 発行の単位を間違えても無期限の Cookie にしない（docs/spec.md §6「30日で失効」）
  if (exp - nowSec > MAX_SESSION_SEC) return null;
  return { device, role: knownRole, exp };
}
