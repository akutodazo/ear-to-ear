/**
 * 元ファイルの SHA-256（二重登録の判定に使う。K7）。Web Crypto（crypto.subtle）なので、ブラウザと Node の両方で動く。
 */

/** 小文字の16進64桁 */
export async function sha256Hex(bytes: ArrayBuffer | Uint8Array): Promise<string> {
  void bytes;
  throw new Error("not implemented");
}
