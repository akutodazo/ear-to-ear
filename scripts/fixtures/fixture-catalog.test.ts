import { beforeAll, describe, expect, it } from "vitest";
import fieldsData from "../../src/data/fields.json";
import { FICTIONAL_AREA } from "../../src/config";
import type { Field } from "../../src/types";
import { candidateFieldIds } from "../../src/services/candidates";
import { readPhotoMeta } from "../../src/services/photo-meta";
import { InvalidJpegError, inspectJpeg } from "../../src/services/jpeg-segments";
import { encodeJpeg } from "./jpeg-encoder";
import {
  buildFixtures,
  drawField,
  exifPayload,
  iccPayload,
  withAppSegments,
  xmpPayload,
  type Fixture,
} from "./fixture-catalog";

const fields: Field[] = fieldsData;
const tiny = () => encodeJpeg({ width: 8, height: 8, data: new Uint8Array(8 * 8 * 3).fill(128) });
const ascii = (bytes: Uint8Array, length: number) => String.fromCharCode(...bytes.subarray(0, length));

describe("APP の中身の組み立て", () => {
  it("XMP: 位置と撮影日を readPhotoMeta が読める（DJI の書き方）", () => {
    const payload = xmpPayload({ position: { lat: 41.8078, lng: 144.5079 }, createDate: "2026-07-21T10:15:30" });
    expect(ascii(payload, 29)).toBe("http://ns.adobe.com/xap/1.0/\0");
    const meta = readPhotoMeta(withAppSegments(tiny(), [{ marker: 0xe1, payload }]));
    expect(meta).toEqual({ position: { lat: 41.8078, lng: 144.5079 }, takenAt: "2026-07-21", takenAtSource: "xmp" });
  });

  it("EXIF: 度分秒の位置と、時差つきの撮影日を readPhotoMeta が読める", () => {
    const payload = exifPayload({
      position: { lat: 41.8112, lng: 144.5121 },
      dateTimeOriginal: "2026:07:22 14:05:00",
      offsetTimeOriginal: "+09:00",
    });
    expect(ascii(payload, 6)).toBe("Exif\0\0");
    const meta = readPhotoMeta(withAppSegments(tiny(), [{ marker: 0xe1, payload }]));
    expect(meta.takenAt).toBe("2026-07-22");
    expect(meta.takenAtSource).toBe("exif");
    expect(meta.position?.lat).toBeCloseTo(41.8112, 5);
    expect(meta.position?.lng).toBeCloseTo(144.5121, 5);
  });

  it("EXIF: 消された位置（Android の Chrome の 0/0）は位置なしと読まれる", () => {
    const payload = exifPayload({ position: "erased", dateTimeOriginal: "2026:07:23 09:00:00" });
    const meta = readPhotoMeta(withAppSegments(tiny(), [{ marker: 0xe1, payload }]));
    expect(meta.position).toBeNull();
    expect(meta.takenAt).toBe("2026-07-23");
  });

  it("ICC: APP2 の中身は ICC_PROFILE で始まる", () => {
    expect(ascii(iccPayload(), 12)).toBe("ICC_PROFILE\0");
  });

  it("withAppSegments: SOI の直後に、渡した順で差し込む。元のバイト列は変えない", () => {
    const base = tiny();
    const copy = base.slice();
    const out = withAppSegments(base, [
      { marker: 0xe2, payload: iccPayload() },
      { marker: 0xe1, payload: xmpPayload({ position: { lat: 41.81, lng: 144.51 } }) },
    ]);
    expect(inspectJpeg(out).appSegments).toEqual([2, 1]);
    expect([...out.subarray(0, 4)]).toEqual([0xff, 0xd8, 0xff, 0xe2]);
    expect(base).toEqual(copy);
  });

  it("withAppSegments: 64KB を超える中身は RangeError（長さの欄に入らない）", () => {
    expect(() => withAppSegments(tiny(), [{ marker: 0xe1, payload: new Uint8Array(65534) }])).toThrow(RangeError);
  });
});

describe("drawField（麦畑ふうの絵）", () => {
  it("幅×高さ×3 バイトで、同じ引数なら同じ中身", () => {
    const a = drawField(64, 48, "01");
    expect(a.width).toBe(64);
    expect(a.height).toBe(48);
    expect(a.data).toHaveLength(64 * 48 * 3);
    expect(drawField(64, 48, "01").data).toEqual(a.data);
  });

  it("番号が違えば絵が違う（端末で見分けられる）", () => {
    expect(drawField(64, 48, "01").data).not.toEqual(drawField(64, 48, "02").data);
  });
});

describe("buildFixtures（合成写真の一覧）", () => {
  let fixtures: Fixture[];
  const byName = (prefix: string) => {
    const found = fixtures.find((f) => f.name.startsWith(prefix));
    if (!found) throw new Error(`${prefix} が無い`);
    return found;
  };

  beforeAll(() => {
    fixtures = buildFixtures(encodeJpeg);
  }, 60_000);

  it("仕様の8種類（XMP 位置あり／EXIF 位置あり／0/0／位置なし／日時なし／APP2 付き／壊れた画像／重複）がそろう", () => {
    expect(fixtures.map((f) => f.name)).toEqual([
      "01-xmp-A06.jpg",
      "02-exif-A03.jpg",
      "03-exif-zero.jpg",
      "04-no-position.jpg",
      "05-no-date-A10.jpg",
      "06-app2-A11.jpg",
      "07-broken.jpg",
      "08-duplicate-of-01.jpg",
    ]);
    for (const f of fixtures) expect(f.purpose.length).toBeGreaterThan(0);
  });

  it("書いた期待どおりに readPhotoMeta と候補の計算が読む（端末の中で起きることと同じ）", () => {
    for (const f of fixtures) {
      const meta = readPhotoMeta(f.bytes);
      const nearest = meta.position === null ? null : (candidateFieldIds(meta.position, fields)[0] ?? null);
      expect({ name: f.name, nearest, takenAt: meta.takenAt, source: meta.takenAtSource }).toEqual({
        name: f.name,
        nearest: f.expect.nearestFieldId,
        takenAt: f.expect.takenAt,
        source: f.expect.takenAtSource,
      });
    }
  });

  it("位置はすべて架空の範囲（P15）の中", () => {
    for (const f of fixtures) {
      const position = readPhotoMeta(f.bytes).position;
      if (position === null) continue;
      expect(position.lat).toBeGreaterThanOrEqual(FICTIONAL_AREA.latMin);
      expect(position.lat).toBeLessThanOrEqual(FICTIONAL_AREA.latMax);
      expect(position.lng).toBeGreaterThanOrEqual(FICTIONAL_AREA.lngMin);
      expect(position.lng).toBeLessThanOrEqual(FICTIONAL_AREA.lngMax);
    }
  });

  it("壊れていない写真は JPEG として解析でき、APP は期待どおり", () => {
    const apps = Object.fromEntries(
      fixtures.filter((f) => !f.expect.broken).map((f) => [f.name, inspectJpeg(f.bytes).appSegments]),
    );
    expect(apps).toEqual({
      "01-xmp-A06.jpg": [1],
      "02-exif-A03.jpg": [1],
      "03-exif-zero.jpg": [1],
      "04-no-position.jpg": [1],
      "05-no-date-A10.jpg": [1],
      "06-app2-A11.jpg": [2, 1],
      "08-duplicate-of-01.jpg": [1],
    });
  });

  it("01 はドローンの写真の大きさ（4000×3000）で、送る前の縮小を確かめられる", () => {
    const info = inspectJpeg(byName("01").bytes);
    expect([info.width, info.height]).toEqual([4000, 3000]);
  });

  it("壊れた画像は解析で InvalidJpegError、readPhotoMeta は例外を出さずに位置なし・日付不明", () => {
    const broken = byName("07");
    expect(broken.expect.broken).toBe(true);
    expect(() => inspectJpeg(broken.bytes)).toThrow(InvalidJpegError);
    expect(readPhotoMeta(broken.bytes)).toEqual({ position: null, takenAt: null, takenAtSource: "none" });
  });

  it("重複は 01 と同じバイト列（同じハッシュになり、サーバーで 409）", () => {
    expect(byName("08").bytes).toEqual(byName("01").bytes);
  });
});
