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
  void bytes;
  throw new Error("not implemented");
}
