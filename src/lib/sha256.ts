/**
 * 元ファイルの SHA-256（二重登録の判定に使う。K7）。Web Crypto（crypto.subtle）なので、ブラウザと Node の両方で動く。
 */

/** 小文字の16進64桁 */
export async function sha256Hex(bytes: ArrayBuffer | Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}
