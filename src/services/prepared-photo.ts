/**
 * 縮小・再エンコードした JPEG を送ってよいかの最後の確かめ（K6 の守り）。純粋関数。
 * JPEG の解析（T03 の inspectJpeg）は引数で受け取る。
 */

export type InspectJpeg = (bytes: Uint8Array) => { appSegments: number[] };

/** 送ってよければ null、だめなら理由 */
export function checkPreparedJpeg(bytes: Uint8Array, inspect: InspectJpeg, maxBytes: number): string | null {
  void bytes;
  void inspect;
  void maxBytes;
  throw new Error("not implemented");
}
