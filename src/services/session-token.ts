/**
 * 合言葉で入った端末に渡す Cookie の値（docs/spec.md §6 API）。
 * 形は base64url(JSON{device, role, exp}).base64url(HMAC-SHA256)。
 * HMAC は引数で受け取る（Worker では crypto.subtle、テストでは node:crypto）。
 */
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

/** 正しければ中身を返す。改ざん・期限切れ・形の崩れは null */
export async function verifySessionToken(
  _token: string,
  _hmac: Hmac,
  _nowSec: number,
): Promise<SessionClaims | null> {
  throw new Error("not implemented");
}
