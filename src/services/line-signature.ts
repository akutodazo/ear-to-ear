/**
 * LINE の Webhook の署名の検証（docs/spec.md §6 API の POST /api/line/webhook、§9 line-signature）。
 * x-line-signature は、チャネルシークレットを鍵にした本文（生のバイト列）の HMAC-SHA256 の標準 base64。
 * HMAC は引数で受け取る（Worker では crypto.subtle、テストでは node:crypto）。
 */

/** チャネルシークレットを閉じ込めた HMAC-SHA256。body は受け取った本文そのもの */
export type LineHmac = (body: Uint8Array) => Promise<Uint8Array>;

/** HMAC-SHA256 の長さ */
const SIGNATURE_BYTES = 32;

/** 32 バイトの標準 base64 は 43 文字 + "=" 1 つ。空白・改行・base64url の文字は通さない */
const BASE64_32 = /^[A-Za-z0-9+/]{43}=$/;

/** 見出しを 32 バイトに戻す。形が違えば null */
function decodeSignature(header: string): Uint8Array | null {
  if (!BASE64_32.test(header)) return null;
  let binary: string;
  try {
    binary = atob(header);
  } catch {
    return null;
  }
  if (binary.length !== SIGNATURE_BYTES) return null;
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

/** 長さが同じなら、どこで違っても最後まで比べる（違う位置から署名を推測させない） */
function equalsConstantTime(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/**
 * 正しい署名なら true。見出しが無い・形が崩れているときは hmac を呼ばずに false。
 * hmac が例外を投げたときも false（401 で返し、例外を外に出さない）。
 */
export async function verifyLineSignature(
  body: Uint8Array,
  header: string | null,
  hmac: LineHmac,
): Promise<boolean> {
  if (header === null) return false;
  const expected = decodeSignature(header);
  if (expected === null) return false;

  let actual: Uint8Array;
  try {
    actual = await hmac(body);
  } catch {
    return false;
  }
  return equalsConstantTime(actual, expected);
}
