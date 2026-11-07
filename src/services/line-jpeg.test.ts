// #172（レビューの指摘）: LINE から取った JPEG は端末で作られたバイト列のまま。画像の復元に要るセグメント以外を全部消す
import { describe, expect, it } from "vitest";
import { inspectJpeg, scanJpegMarkers } from "./jpeg-segments";
import { keepImageSegmentsOnly } from "./line-jpeg";
import { jpegOf, segment, sof, tinyJpeg } from "./test-jpeg";

const DQT = segment(0xdb, [0x00, ...new Array<number>(64).fill(1)]);
const DHT = segment(0xc4, [0x00, ...new Array<number>(16).fill(0), 0x00]);
const DRI = segment(0xdd, [0x00, 0x10]);
const SOS = segment(0xda, [1, 1, 0x00, 0x00, 0x3f, 0x00]);
const EOI = [0xff, 0xd9];
/** スキャンの中身。詰め物（FF 00）と RST（FF D0〜D7）と、マーカーの前の詰め物（FF FF）を含む */
const SCAN = [0x12, 0xff, 0x00, 0x34, 0xff, 0xd0, 0x56, 0xff, 0xd7, 0x78];

const JFIF_APP0 = segment(0xe0, [0x4a, 0x46, 0x49, 0x46, 0x00, 1, 1, 0, 0, 1, 0, 1, 0, 0]);
const EXIF_IN_APP0 = segment(0xe0, [0x4a, 0x46, 0x49, 0x46, 0x00, 0x45, 0x78, 0x69, 0x66, 0x00, 0x47, 0x50, 0x53]);
const EXIF_APP1 = segment(0xe1, [0x45, 0x78, 0x69, 0x66, 0x00, 0x47, 0x50, 0x53]);
/** COM（FE）に緯度・経度の文 */
const COM = segment(0xfe, Array.from(new TextEncoder().encode("lat=43.0,lon=141.0")));
const JPG_EXT = segment(0xf0, [1, 2, 3]);

function bytesOf(...parts: number[][]): number[] {
  return parts.flat();
}

function contains(haystack: Uint8Array, needle: string): boolean {
  return Buffer.from(haystack).includes(Buffer.from(needle));
}

describe("keepImageSegmentsOnly（#172）", () => {
  it("DQT・DHT・SOF・DRI・SOS・スキャン・EOI だけを、並びとバイトを変えずに残す", () => {
    const input = jpegOf(DQT, DHT, DRI, sof(0xc0, 1200, 900), SOS, SCAN, EOI);
    expect(keepImageSegmentsOnly(input)).toStrictEqual(input);
  });

  it("APP0（JFIF も、Exif を詰めたものも）・APP1〜15・COM・JPGn を消す", () => {
    const input = jpegOf(JFIF_APP0, EXIF_IN_APP0, EXIF_APP1, segment(0xed, [1, 2]), COM, JPG_EXT, DQT, sof(0xc2, 800, 600), DHT, SOS, SCAN, EOI);
    const expected = jpegOf(DQT, sof(0xc2, 800, 600), DHT, SOS, SCAN, EOI);
    expect(keepImageSegmentsOnly(input)).toStrictEqual(expected);
  });

  it("結果は Web の送る流れの検査を通る形（APP が無く、EOI でちょうど終わる）", () => {
    const out = keepImageSegmentsOnly(tinyJpeg({ width: 1200, height: 900, apps: [1, 2, 13] }));
    expect(out).not.toBeNull();
    const bytes = out as Uint8Array;
    expect(inspectJpeg(bytes).appSegments).toStrictEqual([]);
    expect(scanJpegMarkers(bytes)).toStrictEqual({ appSegments: [], endsAtEoi: true });
    expect(contains(bytes, "Exif")).toBe(false);
    expect(contains(bytes, "JFIF")).toBe(false);
  });

  it("最初のスキャンの後ろ（プログレッシブの 2 つ目のスキャンの前）に隠した APP1・COM も消し、2 つ目のスキャンは残す", () => {
    const input = jpegOf(DQT, sof(0xc2, 800, 600), DHT, SOS, SCAN, EXIF_APP1, COM, DHT, SOS, [0x9a, 0xbc], EOI);
    const expected = jpegOf(DQT, sof(0xc2, 800, 600), DHT, SOS, SCAN, DHT, SOS, [0x9a, 0xbc], EOI);
    const out = keepImageSegmentsOnly(input) as Uint8Array;
    expect(out).toStrictEqual(expected);
    expect(contains(out, "lat=")).toBe(false);
  });

  it("EOI の後ろに付け足したバイト列は捨てる", () => {
    const input = jpegOf(DQT, sof(0xc0, 10, 10), SOS, SCAN, EOI, Array.from(new TextEncoder().encode("GPS 43,141")));
    const out = keepImageSegmentsOnly(input) as Uint8Array;
    expect(out).toStrictEqual(jpegOf(DQT, sof(0xc0, 10, 10), SOS, SCAN, EOI));
    expect(contains(out, "GPS")).toBe(false);
  });

  it("DQT の中身の FF E1 を APP と見誤らない（長さで飛ばす）", () => {
    const trickyDqt = segment(0xdb, [0x00, 0xff, 0xe1, 0x00, 0x04, ...new Array<number>(60).fill(1)]);
    const input = jpegOf(trickyDqt, sof(0xc0, 10, 10), SOS, SCAN, EOI);
    expect(keepImageSegmentsOnly(input)).toStrictEqual(input);
  });

  it("SOF が無い・SOS が無い・EOI が無いものは null", () => {
    expect(keepImageSegmentsOnly(jpegOf(DQT, SOS, SCAN, EOI))).toBeNull();
    expect(keepImageSegmentsOnly(jpegOf(DQT, sof(0xc0, 10, 10), EOI))).toBeNull();
    expect(keepImageSegmentsOnly(jpegOf(DQT, sof(0xc0, 10, 10), SOS, SCAN))).toBeNull();
  });

  it("JPEG でない・長さの欄が壊れた・途中で切れたものは null（例外を出さない）", () => {
    expect(keepImageSegmentsOnly(Uint8Array.from([0x89, 0x50, 0x4e, 0x47]))).toBeNull();
    expect(keepImageSegmentsOnly(new Uint8Array(0))).toBeNull();
    expect(keepImageSegmentsOnly(jpegOf([0xff, 0xdb, 0x00, 0x01]))).toBeNull();
    expect(keepImageSegmentsOnly(jpegOf([0xff, 0xdb, 0x00, 0x40, 1, 2]))).toBeNull();
    expect(keepImageSegmentsOnly(jpegOf([0x00, 0x01]))).toBeNull();
    const full = jpegOf(DQT, sof(0xc0, 10, 10), SOS, SCAN, EOI);
    for (let cut = 2; cut < full.length - 1; cut++) {
      expect(keepImageSegmentsOnly(full.subarray(0, cut))).toBeNull();
    }
  });

  it("SOS の前に単独のマーカー（RST・TEM など）があれば null", () => {
    expect(keepImageSegmentsOnly(jpegOf([0xff, 0xd0], DQT, sof(0xc0, 10, 10), SOS, SCAN, EOI))).toBeNull();
    expect(keepImageSegmentsOnly(jpegOf([0xff, 0x01], DQT, sof(0xc0, 10, 10), SOS, SCAN, EOI))).toBeNull();
  });

  it("消すものが無くても新しいバイト列を返す（入力の書き換えに引きずられない）", () => {
    const input = jpegOf(DQT, sof(0xc0, 10, 10), SOS, SCAN, EOI);
    const out = keepImageSegmentsOnly(input) as Uint8Array;
    input[input.length - 3] = 0x00;
    expect(out[out.length - 3]).toBe(SCAN[SCAN.length - 1]);
  });

  it("並べ方の例: bytesOf で組んだ JFIF＋Exif の普通の携帯の写真の形", () => {
    const phone = jpegOf(bytesOf(JFIF_APP0, EXIF_APP1, DQT, sof(0xc0, 1600, 1200), DHT, SOS, SCAN, EOI));
    expect(keepImageSegmentsOnly(phone)).toStrictEqual(jpegOf(DQT, sof(0xc0, 1600, 1200), DHT, SOS, SCAN, EOI));
  });
});
