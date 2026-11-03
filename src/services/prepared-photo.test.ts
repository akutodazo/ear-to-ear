import { describe, expect, it } from "vitest";
import { MAX_UPLOAD_BYTES } from "../config";
import { checkPreparedJpeg, stripAppSegments } from "./prepared-photo";
import { inspectJpeg } from "./jpeg-segments";

const small = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);

describe("checkPreparedJpeg（縮小した写真を送ってよいか）", () => {
  it("メタデータが無く、大きさが上限以下なら送ってよい", () => {
    expect(checkPreparedJpeg(small, () => ({ appSegments: [] }), MAX_UPLOAD_BYTES)).toBeNull();
  });

  it("APP1（EXIF・XMP）が残っていれば送らない（撮影位置が残るおそれ。K6）", () => {
    expect(checkPreparedJpeg(small, () => ({ appSegments: [1] }), MAX_UPLOAD_BYTES)).toMatch(/APP1/);
  });

  it("APP2〜15 が残っていても送らない", () => {
    expect(checkPreparedJpeg(small, () => ({ appSegments: [2] }), MAX_UPLOAD_BYTES)).not.toBeNull();
  });

  it("JPEG として読めなければ送らない", () => {
    const broken = () => {
      throw new Error("JPEG ではない");
    };
    expect(checkPreparedJpeg(small, broken, MAX_UPLOAD_BYTES)).not.toBeNull();
  });

  it("上限ちょうどは送ってよく、1バイトでも超えれば送らない", () => {
    const at = new Uint8Array(10);
    expect(checkPreparedJpeg(at, () => ({ appSegments: [] }), 10)).toBeNull();
    expect(checkPreparedJpeg(new Uint8Array(11), () => ({ appSegments: [] }), 10)).not.toBeNull();
  });
});

// SOI・APP0（JFIF）・APP2（ICC の代わりの中身）・APP1・SOF0・SOS・画像データ・EOI
const APP0 = [0xff, 0xe0, 0x00, 0x07, 0x4a, 0x46, 0x49, 0x46, 0x00];
const APP2 = [0xff, 0xe2, 0x00, 0x06, 0x49, 0x43, 0x43, 0x00];
const APP1 = [0xff, 0xe1, 0x00, 0x08, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00];
const FRAME = [
  0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x10, 0x00, 0x10, 0x01, 0x01, 0x11, 0x00,
  0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0x12, 0x34, 0xff, 0xd9,
];

describe("stripAppSegments（ブラウザが付ける APP2 などを取り除く）", () => {
  it("APP1〜15 を取り除き、APP0 と画像の中身は残す", () => {
    const input = new Uint8Array([0xff, 0xd8, ...APP0, ...APP2, ...APP1, ...FRAME]);
    const out = stripAppSegments(input);
    expect(out).toEqual(new Uint8Array([0xff, 0xd8, ...APP0, ...FRAME]));
  });

  it("取り除いた結果は inspectJpeg で APP1〜15 が無く、幅・高さは変わらない", () => {
    const out = stripAppSegments(new Uint8Array([0xff, 0xd8, ...APP2, ...FRAME]));
    expect(out).not.toBeNull();
    const info = inspectJpeg(out as Uint8Array);
    expect(info.appSegments).toEqual([]);
    expect([info.width, info.height]).toEqual([16, 16]);
  });

  it("APP1〜15 が無ければ同じ中身を返す", () => {
    const input = new Uint8Array([0xff, 0xd8, ...APP0, ...FRAME]);
    expect(stripAppSegments(input)).toEqual(input);
  });

  it("JPEG でない・途中で切れたものは null", () => {
    expect(stripAppSegments(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBeNull();
    expect(stripAppSegments(new Uint8Array([0xff, 0xd8, 0xff, 0xe2, 0x00, 0x40, 0x00]))).toBeNull();
  });
});
