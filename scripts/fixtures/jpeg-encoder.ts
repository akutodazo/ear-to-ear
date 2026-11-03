/**
 * 合成写真（T10）のための、依存なしの JPEG の書き出し（ベースライン、4:4:4、標準のハフマン表）。純粋関数。
 * メタデータ（APP0〜15）は書かない。位置や日時は呼ぶ側（fixture-catalog.ts）が APP1・APP2 を差し込む。
 */

/** 左上から行ごとの RGB（1画素3バイト） */
export interface RgbImage {
  width: number;
  height: number;
  data: Uint8Array;
}

/** ハフマン表（JPEG の DHT の形: 長さごとの個数 16 個と、値の並び） */
export interface HuffmanSpec {
  bits: number[];
  values: number[];
}

/** 標準のハフマン表（ITU-T T.81 付属書 K.3） */
export const STANDARD_TABLES: Record<"dcLuma" | "acLuma" | "dcChroma" | "acChroma", HuffmanSpec> = {
  dcLuma: { bits: [], values: [] },
  acLuma: { bits: [], values: [] },
  dcChroma: { bits: [], values: [] },
  acChroma: { bits: [], values: [] },
};

/** 品質 1〜100（libjpeg と同じ倍率）で、ベースラインの JPEG にする */
export function encodeJpeg(image: RgbImage, quality = 85): Uint8Array {
  void image;
  void quality;
  throw new Error("not implemented");
}
