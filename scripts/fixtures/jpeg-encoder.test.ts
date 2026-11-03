import { describe, expect, it } from "vitest";
import { inspectJpeg } from "../../src/services/jpeg-segments";
import { encodeJpeg, STANDARD_TABLES, type RgbImage } from "./jpeg-encoder";

/** 決まった式で色を塗った絵（同じ引数なら同じ中身） */
function picture(width: number, height: number, noise = 0): RgbImage {
  const data = new Uint8Array(width * height * 3);
  let seed = 7;
  for (let i = 0; i < width * height; i++) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    const n = noise === 0 ? 0 : (seed >>> 24) % noise;
    data[i * 3] = (i * 3 + n) & 255;
    data[i * 3 + 1] = (i * 7 + n) & 255;
    data[i * 3 + 2] = (200 + n) & 255;
  }
  return { width, height, data };
}

/** SOS の後ろ（圧縮した中身）から EOI の前まで */
function scanData(jpeg: Uint8Array): Uint8Array {
  for (let i = 2; i < jpeg.length - 1; ) {
    if (jpeg[i] !== 0xff) throw new Error(`マーカーが無い: ${i}`);
    const marker = jpeg[i + 1];
    const length = (jpeg[i + 2] << 8) | jpeg[i + 3];
    if (marker === 0xda) return jpeg.subarray(i + 2 + length, jpeg.length - 2);
    i += 2 + length;
  }
  throw new Error("SOS が無い");
}

describe("STANDARD_TABLES（標準のハフマン表）", () => {
  it.each(Object.entries(STANDARD_TABLES))("%s: 長さごとの個数は16個、合計が値の数と同じ、値は重ならない", (_, table) => {
    expect(table.bits).toHaveLength(16);
    expect(table.bits.reduce((a, b) => a + b, 0)).toBe(table.values.length);
    expect(new Set(table.values).size).toBe(table.values.length);
  });

  it.each(Object.entries(STANDARD_TABLES))("%s: 符号が作れる（クラフトの不等式。全部1の符号は使わない）", (_, table) => {
    expect(table.values.length).toBeGreaterThan(0);
    const sum = table.bits.reduce((acc, count, i) => acc + count / 2 ** (i + 1), 0);
    expect(sum).toBeLessThan(1);
  });

  it("DC の表の値は 0〜11（差の大きさの分類）", () => {
    const expected = Array.from({ length: 12 }, (_, i) => i);
    expect([...STANDARD_TABLES.dcLuma.values].sort((a, b) => a - b)).toEqual(expected);
    expect([...STANDARD_TABLES.dcChroma.values].sort((a, b) => a - b)).toEqual(expected);
  });

  it("AC の表の値は EOB・ZRL と、連続の長さ 0〜15 × 大きさ 1〜10 の 162 個", () => {
    const expected = [0x00, 0xf0];
    for (let run = 0; run < 16; run++) for (let size = 1; size <= 10; size++) expected.push((run << 4) | size);
    expected.sort((a, b) => a - b);
    expect([...STANDARD_TABLES.acLuma.values].sort((a, b) => a - b)).toEqual(expected);
    expect([...STANDARD_TABLES.acChroma.values].sort((a, b) => a - b)).toEqual(expected);
  });
});

describe("encodeJpeg", () => {
  it("SOI で始まり EOI で終わる", () => {
    const jpeg = encodeJpeg(picture(16, 16));
    expect([...jpeg.subarray(0, 2)]).toEqual([0xff, 0xd8]);
    expect([...jpeg.subarray(-2)]).toEqual([0xff, 0xd9]);
  });

  it.each([
    [16, 16],
    [13, 7],
    [1, 1],
    [64, 40],
  ])("%i×%i: 解析すると同じ幅と高さで、APP は1つも無い", (width, height) => {
    expect(inspectJpeg(encodeJpeg(picture(width, height)))).toEqual({ width, height, appSegments: [] });
  });

  it("ベースライン（SOF0）で、3つの成分を間引かずに書く", () => {
    const jpeg = encodeJpeg(picture(16, 16));
    const at = jpeg.findIndex((b, i) => b === 0xff && jpeg[i + 1] === 0xc0);
    expect(at).toBeGreaterThan(0);
    // 長さ17・精度8・高さ・幅・成分3、各成分は 1×1 の間引き
    expect([...jpeg.subarray(at + 2, at + 19)]).toEqual([
      0, 17, 8, 0, 16, 0, 16, 3, 1, 0x11, 0, 2, 0x11, 1, 3, 0x11, 1,
    ]);
  });

  it("圧縮した中身の 0xFF の後ろには必ず 0x00 を入れる（マーカーと見分けるため）", () => {
    const data = scanData(encodeJpeg(picture(96, 64, 200), 100));
    let ffCount = 0;
    for (let i = 0; i < data.length; i++) {
      if (data[i] === 0xff) {
        ffCount++;
        expect(data[i + 1]).toBe(0x00);
      }
    }
    expect(ffCount).toBeGreaterThan(0);
  });

  it("同じ絵なら同じバイト列", () => {
    expect(encodeJpeg(picture(40, 24, 50))).toEqual(encodeJpeg(picture(40, 24, 50)));
  });

  it("品質を上げると大きくなる", () => {
    const image = picture(64, 64, 120);
    expect(encodeJpeg(image, 95).length).toBeGreaterThan(encodeJpeg(image, 50).length);
  });

  it("幅・高さが 0、中身の長さが合わないときは RangeError", () => {
    expect(() => encodeJpeg({ width: 0, height: 4, data: new Uint8Array(0) })).toThrow(RangeError);
    expect(() => encodeJpeg({ width: 4, height: 4, data: new Uint8Array(10) })).toThrow(RangeError);
    expect(() => encodeJpeg(picture(8, 8), 0)).toThrow(RangeError);
  });
});
