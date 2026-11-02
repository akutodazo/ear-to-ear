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

describe("SOS の後ろ", () => {
  it("画像データの中の APP1 に似たバイト列は見ない", () => {
    const scan = [...SOS, 0xff, 0xe1, 0x00, 0x04, 0x00, 0x00, ...EOI];
    expect(inspectJpeg(jpeg(SOF0, scan)).appSegments).toEqual([]);
  });
});

describe("SOF の種類", () => {
  const markers = [
    0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce,
    0xcf,
  ];

  it.each(markers)("マーカー %i から幅・高さを取る", (marker) => {
    const { width, height } = inspectJpeg(jpeg(sof(marker, 640, 480), SCAN));
    expect({ width, height }).toEqual({ width: 640, height: 480 });
  });
});

describe("SOF に似たマーカー", () => {
  it.each([0xc4, 0xc8, 0xcc])("マーカー %i を SOF と間違えない", (marker) => {
    const lookalike = sof(marker, 9, 9);
    const { width, height } = inspectJpeg(jpeg(lookalike, SOF0, SCAN));
    expect({ width, height }).toEqual({ width: WIDTH, height: HEIGHT });
  });
});

describe("詰め物の 0xFF", () => {
  it("マーカーの前の 0xFF を読み飛ばす", () => {
    const app1 = segment(0xe1, [0x00]);
    const { width, appSegments } = inspectJpeg(
      jpeg([0xff, 0xff], app1, [0xff], SOF0, SCAN),
    );
    expect({ width, appSegments }).toEqual({ width: WIDTH, appSegments: [1] });
  });
});

describe("JPEG 以外", () => {
  it.each([
    ["空", []],
    ["1バイトだけ", [0xff]],
    ["PNG", [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
    ["文字列", [0x6e, 0x6f, 0x74, 0x20, 0x6a, 0x70, 0x65, 0x67]],
  ])("%s は例外", (_name, bytes) => {
    expect(() => inspectJpeg(Uint8Array.from(bytes))).toThrow(InvalidJpegError);
  });
});

describe("長さの欄が不正", () => {
  it.each([
    ["0", [0xff, 0xe1, 0x00, 0x00]],
    ["1", [0xff, 0xe1, 0x00, 0x01]],
    ["残りより長い", [0xff, 0xe1, 0xff, 0xff, 0x00]],
  ])("長さが %s なら例外", (_name, broken) => {
    expect(() => inspectJpeg(jpeg(broken, SOF0, SCAN))).toThrow(
      InvalidJpegError,
    );
  });
});

describe("途中で切れた JPEG", () => {
  it.each([
    ["SOI だけ", []],
    ["マーカーの途中", [[0xff]]],
    ["長さの欄の途中", [[0xff, 0xe1, 0x00]]],
    ["SOF で終わる（SOS が無い）", [SOF0]],
    ["SOS の前に EOI", [SOF0, EOI]],
  ])("%s は例外", (_name, parts) => {
    expect(() => inspectJpeg(jpeg(...parts))).toThrow(InvalidJpegError);
  });
});

describe("見出しの並びが不正", () => {
  it("マーカーの位置に 0xFF 以外があれば例外", () => {
    expect(() => inspectJpeg(jpeg([0x00], SOF0, SCAN))).toThrow(
      InvalidJpegError,
    );
  });

  it("SOF が無ければ例外", () => {
    expect(() => inspectJpeg(jpeg(APP0, SCAN))).toThrow(InvalidJpegError);
  });

  it("SOF の中身が短ければ例外", () => {
    const short = segment(0xc0, [8, 0x00, 0x01]);
    expect(() => inspectJpeg(jpeg(short, SCAN))).toThrow(InvalidJpegError);
  });
});
