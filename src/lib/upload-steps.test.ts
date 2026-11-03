import { describe, expect, it } from "vitest";
import fieldsData from "@/data/fields.json";
import type { Field } from "@/types";
import { candidateFieldIds } from "@/services/candidates";
import { buildUploadMeta } from "@/services/upload-request";
import { PHOTO_INFO_HEAD_BYTES, readPhotoInfo } from "./upload-steps";

// テストの写真はここでバイト列を組み立てる（画像ファイルはコミットしない）。座標は架空の範囲の中（A-06 のすぐ近く）
const fields: Field[] = fieldsData;
const FRAME = [
  0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x10, 0x00, 0x10, 0x01, 0x01, 0x11, 0x00,
  0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0x12, 0x34, 0xff, 0xd9,
];

function djiJpeg(lat: string, lng: string, created: string, tail = 0): File {
  const xml =
    `<rdf:Description drone-dji:GpsLatitude="${lat}" drone-dji:GpsLongitude="${lng}" ` +
    `xmp:CreateDate="${created}"/>`;
  const payload = [...new TextEncoder().encode("http://ns.adobe.com/xap/1.0/"), 0, ...new TextEncoder().encode(xml)];
  const length = payload.length + 2;
  const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe1, length >> 8, length & 0xff, ...payload, ...FRAME]);
  return new File([bytes, new Uint8Array(tail)], "dji.jpg", { type: "image/jpeg" });
}

/** 中身 n バイトの APP2 を count 個並べた後に（最後の1つだけ lastSize バイト）、位置つきの XMP を置いた写真 */
function withAppsBefore(count: number, size: number, lastSize = size): File {
  const parts: number[][] = [];
  for (let i = 0; i < count; i++) {
    const n = i === count - 1 ? lastSize : size;
    const length = n + 2;
    parts.push([0xff, 0xe2, length >> 8, length & 0xff, ...new Array<number>(n).fill(0x41)]);
  }
  const xmp = djiJpeg("41.8075", "144.5076", "2026-07-21T10:15:30");
  return new File([new Uint8Array([0xff, 0xd8]), ...parts.map((p) => new Uint8Array(p)), xmp.slice(2)], "late.jpg", {
    type: "image/jpeg",
  });
}

describe("readPhotoInfo（写真の情報を端末の中で読む。T01 の readPhotoMeta につなぐ）", () => {
  it("DJI の XMP から撮影位置と撮影日を読む", async () => {
    const info = await readPhotoInfo(djiJpeg("41.8075", "144.5076", "2026-07-21T10:15:30"));
    expect(info).toEqual({
      position: { lat: 41.8075, lng: 144.5076 },
      takenAt: "2026-07-21",
      takenAtSource: "xmp",
    });
  });

  it("後ろに大きな画像データが続いても同じ結果", async () => {
    const info = await readPhotoInfo(djiJpeg("41.8075", "144.5076", "2026-07-21T10:15:30", 4 * 1024 * 1024));
    expect(info.position).toEqual({ lat: 41.8075, lng: 144.5076 });
  });

  it("写真の先頭 PHOTO_INFO_HEAD_BYTES より後ろの APP1 は読まない（丸ごと読まない。PR #51 のレビュー #1）", async () => {
    // 64KB 近い APP2 を並べて先頭を越えさせ、その後ろに位置つきの XMP を置く
    const before = Math.ceil(PHOTO_INFO_HEAD_BYTES / 65537) + 1;
    const info = await readPhotoInfo(withAppsBefore(before, 65533));
    expect(info).toEqual({ position: null, takenAt: null, takenAtSource: "none" });
  });

  it("先頭の境目をまたぐ XMP は、例外を出さずに位置なし・日付不明（512KB より後ろは読めない弱点。PR #51 のレビュー #2）", async () => {
    // APP2 の合計を先頭の少し手前までにして、XMP が境目をまたぐようにする
    const full = Math.floor(PHOTO_INFO_HEAD_BYTES / 65537);
    const rest = PHOTO_INFO_HEAD_BYTES - 2 - full * 65537 - 40;
    const info = await readPhotoInfo(withAppsBefore(full + 1, 65533, rest - 4));
    expect(info).toEqual({ position: null, takenAt: null, takenAtSource: "none" });
  });

  it("JPEG でなければ位置なし・日付不明（例外を出さない）", async () => {
    const file = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "a.png", { type: "image/png" });
    expect(await readPhotoInfo(file)).toEqual({ position: null, takenAt: null, takenAtSource: "none" });
  });
});

describe("撮影位置は送る meta に入らない（K6、PR #50 のレビュー #7 の申し送り）", () => {
  it("読んだ位置で候補を出しても、送る meta は番号だけで座標を含まない", async () => {
    const info = await readPhotoInfo(djiJpeg("41.8075", "144.5076", "2026-07-21T10:15:30"));
    expect(info.position).not.toBeNull();
    const ids = candidateFieldIds(info.position, fields);
    expect(ids[0]).toBe("A-06");
    const meta = buildUploadMeta({
      contentHash: "c".repeat(64),
      takenAt: info.takenAt,
      takenAtSource: info.takenAtSource,
      candidateFieldIds: ids,
      chosenFieldId: null,
    });
    const text = JSON.stringify(meta);
    expect(text).not.toContain("41.8075");
    expect(text).not.toContain("144.5076");
    expect(Object.keys(meta).sort()).toEqual(
      ["candidateFieldIds", "chosenFieldId", "contentHash", "takenAt", "takenAtSource"].sort(),
    );
  });
});
