/**
 * 縮小・再エンコードした JPEG を送ってよいかの最後の確かめ（K6 の守り）。純粋関数。
 * JPEG の解析（T03 の inspectJpeg）は引数で受け取る。
 */

export type InspectJpeg = (bytes: Uint8Array) => { appSegments: number[] };

/** 送ってよければ null、だめなら理由 */
export function checkPreparedJpeg(bytes: Uint8Array, inspect: InspectJpeg, maxBytes: number): string | null {
  if (bytes.length > maxBytes) return "縮小しても大きすぎる";
  let apps: number[];
  try {
    apps = inspect(bytes).appSegments;
  } catch {
    return "JPEG として読めない";
  }
  if (apps.length > 0) return `メタデータ（${apps.map((n) => `APP${n}`).join("・")}）が残っている`;
  return null;
}

/**
 * JPEG から APP1〜APP15 のセグメントを取り除く（SOS より前だけ。APP0 の JFIF は残す）。
 * ブラウザの再エンコードは色の情報（APP2、ICC プロファイル）を付けるが、公開側には APP1〜15 を残さない決まり（AGENTS.md §1-4）。
 * JPEG として読めなければ null
 */
export function stripAppSegments(bytes: Uint8Array): Uint8Array | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  const kept: Uint8Array[] = [bytes.subarray(0, 2)];
  let i = 2;
  while (i + 4 <= bytes.length) {
    if (bytes[i] !== 0xff) return null;
    const marker = bytes[i + 1];
    // SOS から後ろ（画像のデータと EOI）はそのまま残す
    if (marker === 0xda) {
      kept.push(bytes.subarray(i));
      const out = new Uint8Array(kept.reduce((n, part) => n + part.length, 0));
      let at = 0;
      for (const part of kept) {
        out.set(part, at);
        at += part.length;
      }
      return out;
    }
    const length = (bytes[i + 2] << 8) | bytes[i + 3];
    if (length < 2 || i + 2 + length > bytes.length) return null;
    const isApp1To15 = marker >= 0xe1 && marker <= 0xef;
    if (!isApp1To15) kept.push(bytes.subarray(i, i + 2 + length));
    i += 2 + length;
  }
  return null;
}
