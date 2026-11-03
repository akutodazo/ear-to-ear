import { describe, expect, it } from "vitest";
import { MAX_UPLOAD_BYTES } from "../config";
import type { UploadMeta } from "@/types";
import { inspectJpeg, InvalidJpegError, type JpegInfo } from "./jpeg-segments";
import {
  checkUploadImage,
  checkUploadParts,
  isMultipartContentType,
  PHOTO_COLUMNS,
  photoRow,
  photoRowValues,
  r2KeyFor,
  UPLOAD_BODY_MAX_BYTES,
  type FormPart,
} from "./upload-form";

// 画像ファイルはコミットしない（AGENTS.md §1-5）。テストの JPEG はここでバイト列を組み立てる
function segment(marker: number, payload: number[] = []): number[] {
  const length = payload.length + 2;
  return [0xff, marker, length >> 8, length & 0xff, ...payload];
}

function jpeg(options: { width?: number; height?: number; apps?: number[]; tail?: number[] } = {}): Uint8Array {
  const { width = 1600, height = 1200, apps = [], tail = [0xff, 0xd9] } = options;
  return Uint8Array.from([
    0xff,
    0xd8,
    ...segment(0xe0, [0x4a, 0x46, 0x49, 0x46, 0x00]),
    ...apps.flatMap((n) => segment(0xe0 + n, [0x45, 0x78, 0x69, 0x66, 0x00])),
    ...segment(0xc0, [8, height >> 8, height & 0xff, width >> 8, width & 0xff, 1, 1, 0x11, 0]),
    ...segment(0xda, [1, 1, 0x00, 0x00, 0x3f, 0x00]),
    0x12,
    0x34,
    ...tail,
  ]);
}

const LONG_EDGE = 1600;

function check(bytes: Uint8Array, inspect: (b: Uint8Array) => JpegInfo = inspectJpeg, maxBytes = MAX_UPLOAD_BYTES) {
  return checkUploadImage(bytes, inspect, maxBytes, LONG_EDGE);
}

describe("UPLOAD_BODY_MAX_BYTES", () => {
  it("画像の上限に 16KB のゆとりを足す", () => {
    expect(UPLOAD_BODY_MAX_BYTES).toBe(MAX_UPLOAD_BYTES + 16 * 1024);
  });
});

describe("isMultipartContentType", () => {
  it.each([
    "multipart/form-data; boundary=abc",
    "Multipart/Form-Data;boundary=abc",
    " multipart/form-data ; boundary=abc",
    "multipart/form-data",
  ])("%s は multipart", (header) => {
    expect(isMultipartContentType(header)).toBe(true);
  });

  it.each([
    ["無い", null],
    ["空", ""],
    ["JSON", "application/json"],
    ["別の multipart", "multipart/mixed; boundary=abc"],
    ["似た名前", "multipart/form-datax; boundary=abc"],
    ["JPEG そのもの", "image/jpeg"],
  ])("%s は multipart でない", (_name, header) => {
    expect(isMultipartContentType(header)).toBe(false);
  });
});

describe("checkUploadParts", () => {
  const image = new Uint8Array([1, 2, 3]);

  it("image（バイト列）と meta（文字列）が 1 つずつなら、その 2 つを返す", () => {
    expect(
      checkUploadParts([
        { name: "meta", value: "{}" },
        { name: "image", value: image },
      ]),
    ).toStrictEqual({ ok: true, image, meta: "{}" });
  });

  it.each<[string, FormPart[]]>([
    ["空", []],
    ["image が無い", [{ name: "meta", value: "{}" }]],
    ["meta が無い", [{ name: "image", value: image }]],
    [
      "image が 2 つ",
      [
        { name: "image", value: image },
        { name: "image", value: image },
        { name: "meta", value: "{}" },
      ],
    ],
    [
      "meta が 2 つ",
      [
        { name: "image", value: image },
        { name: "meta", value: "{}" },
        { name: "meta", value: "{}" },
      ],
    ],
    [
      "余分な欄（lat）",
      [
        { name: "image", value: image },
        { name: "meta", value: "{}" },
        { name: "lat", value: "41.8" },
      ],
    ],
    [
      "meta がファイル",
      [
        { name: "image", value: image },
        { name: "meta", value: new Uint8Array([0x7b, 0x7d]) },
      ],
    ],
    [
      "image が文字列",
      [
        { name: "image", value: "abc" },
        { name: "meta", value: "{}" },
      ],
    ],
  ])("%s は bad_form", (_name, parts) => {
    expect(checkUploadParts(parts)).toStrictEqual({ ok: false, reason: "bad_form" });
  });
});

describe("checkUploadImage", () => {
  it("メタデータの無い JPEG は幅・高さを返す", () => {
    expect(check(jpeg({ width: 1600, height: 900 }))).toStrictEqual({ ok: true, width: 1600, height: 900 });
  });

  it("上限ちょうどは通り、1 バイト超えると too_large", () => {
    const bytes = jpeg();
    expect(check(bytes, inspectJpeg, bytes.byteLength).ok).toBe(true);
    expect(check(bytes, inspectJpeg, bytes.byteLength - 1)).toStrictEqual({ ok: false, reason: "too_large" });
  });

  it("大きすぎは、APP があっても先に too_large（413 を先に返す）", () => {
    const bytes = jpeg({ apps: [1] });
    expect(check(bytes, inspectJpeg, bytes.byteLength - 1)).toStrictEqual({ ok: false, reason: "too_large" });
  });

  it("inspect が InvalidJpegError を投げたら not_jpeg", () => {
    expect(check(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toStrictEqual({ ok: false, reason: "not_jpeg" });
  });

  it("inspect がふつうの Error を投げても not_jpeg（例外の種類を問わない）", () => {
    const inspect = () => {
      throw new Error("boom");
    };
    expect(check(jpeg(), inspect)).toStrictEqual({ ok: false, reason: "not_jpeg" });
  });

  it("空のバイト列は not_jpeg", () => {
    expect(check(new Uint8Array(0))).toStrictEqual({ ok: false, reason: "not_jpeg" });
  });

  it.each([1, 2, 15])("APP%i があれば metadata", (n) => {
    expect(check(jpeg({ apps: [n] }))).toStrictEqual({ ok: false, reason: "metadata" });
  });

  it("inspect の appSegments を見る（注入した inspect が APP を返せば metadata）", () => {
    const inspect = (): JpegInfo => ({ width: 10, height: 10, appSegments: [2] });
    expect(check(jpeg(), inspect)).toStrictEqual({ ok: false, reason: "metadata" });
  });

  it.each([
    [1600, 1200, true],
    [1600, 1600, true],
    [1601, 1200, false],
    [1200, 1601, false],
  ])("%i×%i は長辺の上限 1600 で ok=%s", (width, height, ok) => {
    const result = check(jpeg({ width, height }));
    expect(result.ok).toBe(ok);
    if (!ok) expect(result).toStrictEqual({ ok: false, reason: "bad_dimensions" });
  });

  it.each([
    ["EOI が無い", []],
    ["EOI の後ろに付け足し", [0xff, 0xd9, 0x00]],
    ["途中で切れた", [0xff]],
  ])("末尾が FF D9 でない（%s）は not_jpeg", (_name, tail) => {
    expect(check(jpeg({ tail }))).toStrictEqual({ ok: false, reason: "not_jpeg" });
  });

  it("順番: APP があって末尾も壊れていれば metadata、大きさも越えていれば metadata が先", () => {
    expect(check(jpeg({ apps: [1], tail: [] }))).toStrictEqual({ ok: false, reason: "metadata" });
    expect(check(jpeg({ apps: [1], width: 4000 }))).toStrictEqual({ ok: false, reason: "metadata" });
  });

  it("大きさの上限超えは、末尾の壊れより先に bad_dimensions", () => {
    expect(check(jpeg({ width: 4000, tail: [] }))).toStrictEqual({ ok: false, reason: "bad_dimensions" });
  });

  it("inspect が投げた InvalidJpegError を握って not_jpeg にする（外に出さない）", () => {
    const inspect = () => {
      throw new InvalidJpegError("x");
    };
    expect(check(jpeg(), inspect)).toStrictEqual({ ok: false, reason: "not_jpeg" });
  });
});

describe("r2KeyFor", () => {
  it("uploads/<id>.jpg", () => {
    expect(r2KeyFor("00000000-0000-4000-8000-000000000001")).toBe("uploads/00000000-0000-4000-8000-000000000001.jpg");
  });
});

describe("photoRow と PHOTO_COLUMNS", () => {
  const meta: UploadMeta = {
    contentHash: "a".repeat(64),
    takenAt: "2026-07-24",
    takenAtSource: "exif",
    candidateFieldIds: ["A-06", "A-05"],
    chosenFieldId: "A-05",
  };
  const input = {
    id: "id-1",
    meta,
    width: 1600,
    height: 1200,
    bytes: 123456,
    device: "dev-1",
    nowIso: "2026-10-26T07:33:20.000Z",
  };

  it("15 列ちょうどで、値は入力どおり（chosenFieldId があっても unconfirmed、field_id は null）", () => {
    expect(photoRow(input)).toStrictEqual({
      id: "id-1",
      field_id: null,
      chosen_field_id: "A-05",
      state: "unconfirmed",
      candidate_field_ids: '["A-06","A-05"]',
      taken_at: "2026-07-24",
      taken_at_source: "exif",
      content_hash: "a".repeat(64),
      r2_key: "uploads/id-1.jpg",
      width: 1600,
      height: 1200,
      bytes: 123456,
      uploader_device: "dev-1",
      uploaded_at: "2026-10-26T07:33:20.000Z",
      updated_at: "2026-10-26T07:33:20.000Z",
    });
  });

  it("日付不明・選んだ番号なし・候補なしもそのまま", () => {
    const row = photoRow({
      ...input,
      meta: { ...meta, takenAt: null, takenAtSource: "none", candidateFieldIds: [], chosenFieldId: null },
    });
    expect(row).toMatchObject({ taken_at: null, taken_at_source: "none", candidate_field_ids: "[]", chosen_field_id: null });
  });

  it("PHOTO_COLUMNS は photoRow の列と同じ 15 個で、重複が無い", () => {
    expect(PHOTO_COLUMNS).toHaveLength(15);
    expect(new Set(PHOTO_COLUMNS).size).toBe(15);
    expect([...PHOTO_COLUMNS].sort()).toEqual(Object.keys(photoRow(input)).sort());
  });

  it("photoRowValues は PHOTO_COLUMNS の並びの値", () => {
    const row = photoRow(input);
    expect(photoRowValues(row)).toEqual(PHOTO_COLUMNS.map((column) => row[column]));
  });

  it("座標・距離らしい列は無い（K6）", () => {
    for (const column of PHOTO_COLUMNS) {
      expect(column).not.toMatch(/lat|lng|lon|gps|dist|coord|position|meter/i);
    }
  });
});
