/**
 * 縮小・再エンコードした JPEG を送ってよいかの最後の確かめ（K6 の守り）。純粋関数。
 * JPEG の解析（T03 の inspectJpeg）は引数で受け取る。
 */

export type InspectJpeg = (bytes: Uint8Array) => { appSegments: number[] };

/** 送ってよいかの結果。表示の文言は画面の側で決める */
export type PreparedCheck =
  | { kind: "ok" }
  | { kind: "too-large" }
  | { kind: "unreadable" }
  | { kind: "metadata"; apps: number[] };

export function checkPreparedJpeg(bytes: Uint8Array, inspect: InspectJpeg, maxBytes: number): PreparedCheck {
  if (bytes.length > maxBytes) return { kind: "too-large" };
  let apps: number[];
  try {
    apps = inspect(bytes).appSegments;
  } catch {
    return { kind: "unreadable" };
  }
  return apps.length > 0 ? { kind: "metadata", apps } : { kind: "ok" };
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

export type PrepareResult = { ok: true; bytes: Uint8Array } | { ok: false; reason: "too-large" | "unreadable" | "metadata" };

/**
 * 送る前の流れ: 画質を順に試して再エンコード → APP1〜15 を取り除く → 確かめる。
 * 大きすぎるときだけ次の画質でやり直す。読めない・メタデータが残るときはすぐに止める。
 * 再エンコード（ブラウザ）と JPEG の解析は引数で受け取る
 */
export async function prepareJpeg(
  encode: (quality: number) => Promise<Uint8Array>,
  qualities: readonly number[],
  maxBytes: number,
  inspect: InspectJpeg,
): Promise<PrepareResult> {
  for (const quality of qualities) {
    const stripped = stripAppSegments(await encode(quality));
    if (stripped === null) return { ok: false, reason: "unreadable" };
    const check = checkPreparedJpeg(stripped, inspect, maxBytes);
    if (check.kind === "ok") return { ok: true, bytes: stripped };
    if (check.kind !== "too-large") return { ok: false, reason: check.kind };
  }
  return { ok: false, reason: "too-large" };
}
