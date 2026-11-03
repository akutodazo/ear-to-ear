/**
 * ブラウザで写真を縮小し、JPEG に再エンコードする（docs/spec.md §4 の 3。ブラウザ専用）。
 * 再エンコードでメタデータ（EXIF・XMP の撮影位置を含む）はすべて消える（K6）。向き（EXIF の Orientation）は画素に反映してから消す。
 */
import { resizedSize } from "../services/resize-plan";

/** 再エンコードの画質（0〜1）。上限（MAX_UPLOAD_BYTES）を超えたら下げてやり直す */
export const JPEG_QUALITIES = [0.85, 0.7, 0.55] as const;

export async function resizeToJpeg(file: Blob, quality: number): Promise<Blob> {
  // 向きを画素に反映する（再エンコードで Orientation の欄は消えるため）
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const { width, height } = resizedSize(bitmap.width, bitmap.height);
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext("2d");
    if (context === null) throw new Error("canvas が使えない");
    context.drawImage(bitmap, 0, 0, width, height);
    return await canvas.convertToBlob({ type: "image/jpeg", quality });
  } finally {
    bitmap.close();
  }
}
