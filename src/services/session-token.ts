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

export async function issueSessionToken(
  _claims: SessionClaims,
  _hmac: Hmac,
): Promise<string> {
  throw new Error("not implemented");
}

/** 正しければ中身を返す。改ざん・期限切れ・形の崩れは null */
export async function verifySessionToken(
  _token: string,
  _hmac: Hmac,
  _nowSec: number,
): Promise<SessionClaims | null> {
  throw new Error("not implemented");
}
