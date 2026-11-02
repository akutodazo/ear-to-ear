import { describe, expect, it } from "vitest";
import { inspectJpeg, InvalidJpegError } from "./jpeg-segments";

// 画像ファイルはコミットしない（AGENTS.md）。テストの JPEG はここでバイト列を組み立てる
const SOI = [0xff, 0xd8];
const EOI = [0xff, 0xd9];

/** マーカー＋長さの欄（自分の2バイトを含む）＋中身 */
function segment(marker: number, payload: number[] = []): number[] {
  const length = payload.length + 2;
  return [0xff, marker, length >> 8, length & 0xff, ...payload];
}

/** 精度・高さ・幅・成分数の順。成分は1つ */
function sof(marker: number, width: number, height: number): number[] {
  return segment(marker, [
    8,
    height >> 8,
    height & 0xff,
    width >> 8,
    width & 0xff,
    1,
    1,
    0x11,
    0,
  ]);
}

const WIDTH = 1600;
const HEIGHT = 1200;
const APP0 = segment(0xe0, [0x4a, 0x46, 0x49, 0x46, 0x00]);
const SOF0 = sof(0xc0, WIDTH, HEIGHT);
const SOS = segment(0xda, [1, 1, 0x00, 0x00, 0x3f, 0x00]);
/** SOS から終わりまで */
const SCAN = [...SOS, 0x12, 0x34, ...EOI];

function jpeg(...parts: number[][]): Uint8Array {
  return Uint8Array.from([...SOI, ...parts.flat()]);
}

describe("メタデータの無い JPEG", () => {
  it("幅・高さを返し、appSegments は空", () => {
    expect(inspectJpeg(jpeg(SOF0, SCAN))).toEqual({
      width: WIDTH,
      height: HEIGHT,
      appSegments: [],
    });
  });
});

describe("APP0", () => {
  it("JFIF の APP0 は数えない", () => {
    expect(inspectJpeg(jpeg(APP0, SOF0, SCAN)).appSegments).toEqual([]);
  });
});

describe("APP1", () => {
  it("APP1 を検出する", () => {
    const app1 = segment(0xe1, [0x45, 0x78, 0x69, 0x66]);
    expect(inspectJpeg(jpeg(APP0, app1, SOF0, SCAN)).appSegments).toEqual([1]);
  });
});

describe("APP2〜15", () => {
  const numbers = Array.from({ length: 14 }, (_, i) => i + 2);

  it.each(numbers)("APP%i を検出する", (n) => {
    const app = segment(0xe0 + n, [0x00]);
    expect(inspectJpeg(jpeg(app, SOF0, SCAN)).appSegments).toEqual([n]);
  });
});

describe("複数の APP", () => {
  it("出てきた順に全部返す", () => {
    const app2 = segment(0xe2, [0x00]);
    const app1 = segment(0xe1, [0x00]);
    const app13 = segment(0xed, [0x00]);
    expect(inspectJpeg(jpeg(app2, app1, app13, SOF0, SCAN)).appSegments).toEqual(
      [2, 1, 13],
    );
  });
});

describe("SOF の後ろ", () => {
  it("SOF の後ろの APP1 も検出する（SOF で止まらない）", () => {
    const app1 = segment(0xe1, [0x00]);
    expect(inspectJpeg(jpeg(SOF0, app1, SCAN)).appSegments).toEqual([1]);
  });
});
