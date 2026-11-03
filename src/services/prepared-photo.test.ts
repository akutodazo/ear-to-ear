import { describe, expect, it } from "vitest";
import { MAX_UPLOAD_BYTES } from "../config";
import { checkPreparedJpeg } from "./prepared-photo";

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
