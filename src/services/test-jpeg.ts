/**
 * テストで JPEG のバイト列を組み立てる部品（テスト専用。本番のコードからは使わない）。
 * 画像ファイルはコミットしない（AGENTS.md §1-5）ので、メタデータ付きの写真が要るテストはここで組む。
 * jpeg-segments・upload-form・worker のテストが使う。
 */

/** マーカー＋長さの欄（自分の2バイトを含む）＋中身 */
export function segment(marker: number, payload: number[] = []): number[] {
  const length = payload.length + 2;
  return [0xff, marker, length >> 8, length & 0xff, ...payload];
}

/** SOF。精度・高さ・幅・成分数の順。成分は1つ */
export function sof(marker: number, width: number, height: number): number[] {
  return segment(marker, [8, height >> 8, height & 0xff, width >> 8, width & 0xff, 1, 1, 0x11, 0]);
}

/** SOI の後ろに部品を並べる */
export function jpegOf(...parts: number[][]): Uint8Array<ArrayBuffer> {
  return Uint8Array.from([0xff, 0xd8, ...parts.flat()]);
}

/** APP0（JFIF）・APPn（"Exif"）・SOF0・SOS・スキャン・末尾の順の小さな JPEG。scanBytes で大きさを水増しする */
export function tinyJpeg(
  options: { width?: number; height?: number; apps?: number[]; scanBytes?: number; tail?: number[] } = {},
): Uint8Array<ArrayBuffer> {
  const { width = 1600, height = 1200, apps = [], scanBytes = 2, tail = [0xff, 0xd9] } = options;
  const head = jpegOf(
    segment(0xe0, [0x4a, 0x46, 0x49, 0x46, 0x00]),
    ...apps.map((n) => segment(0xe0 + n, [0x45, 0x78, 0x69, 0x66, 0x00])),
    sof(0xc0, width, height),
    segment(0xda, [1, 1, 0x00, 0x00, 0x3f, 0x00]),
  );
  const bytes = new Uint8Array(head.length + scanBytes + tail.length);
  bytes.set(head, 0);
  // スキャンの中身は 0x12 で埋める（0xFF を含まない）
  bytes.fill(0x12, head.length, head.length + scanBytes);
  bytes.set(tail, head.length + scanBytes);
  return bytes;
}
