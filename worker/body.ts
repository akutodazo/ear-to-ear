/**
 * 要求の本文を上限まで読む部品（人が書く。session・uploads が使う）。
 * 上限は読みながらバイトで守る。content-length が無い・偽りでも、全部は読まない。
 */

/** content-length が数として読めて上限を超えるか。読めなければ false（本文を読みながら判定する） */
export function declaredTooLarge(header: string | null, maxBytes: number): boolean {
  if (header === null || !/^\d+$/.test(header)) return false;
  return Number(header) > maxBytes;
}

/** 本文をバイトで上限まで読む。超えたら読むのをやめて null。本文が無ければ空のバイト列 */
export async function readBodyLimited(request: Request, maxBytes: number): Promise<Uint8Array | null> {
  if (request.body === null) return new Uint8Array(0);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}
