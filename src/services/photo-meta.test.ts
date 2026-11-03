import { describe, expect, it } from "vitest";
import { readPhotoMeta } from "./photo-meta";

// テストの写真はここでバイト列を組み立てる（画像ファイルはコミットしない。AGENTS.md §1）。
// 座標はすべて架空の範囲（FICTIONAL_AREA）の中か、わざと外にした値（AGENTS.md §1-6）

// ---- JPEG の組み立て ----
const SOI = [0xff, 0xd8];
const EOI = [0xff, 0xd9];
/** 幅・高さ 16 の最小の SOF0 と SOS と画像データ */
const FRAME = [
  0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x10, 0x00, 0x10, 0x01, 0x01, 0x11, 0x00,
  0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0x12, 0x34,
];

function ascii(text: string): number[] {
  return Array.from(text, (c) => c.charCodeAt(0));
}

function app1(payload: number[]): number[] {
  const length = payload.length + 2;
  return [0xff, 0xe1, length >> 8, length & 0xff, ...payload];
}

function jpeg(...segments: number[][]): Uint8Array {
  return new Uint8Array([...SOI, ...segments.flat(), ...FRAME, ...EOI]);
}

function xmp(xml: string): number[] {
  return app1([...ascii("http://ns.adobe.com/xap/1.0/"), 0, ...new TextEncoder().encode(xml)]);
}

/** DJI の書き方（属性） */
function djiXmp(attrs: Record<string, string>): number[] {
  const body = Object.entries(attrs)
    .map(([k, v]) => `${k}="${v}"`)
    .join(" ");
  return xmp(
    `<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">` +
      `<rdf:Description xmlns:drone-dji="http://www.dji.com/drone-dji/1.0/" xmlns:xmp="http://ns.adobe.com/xap/1.0/" ${body}/>` +
      `</rdf:RDF></x:xmpmeta>`,
  );
}

type Rational = [number, number];
type Dms = [Rational, Rational, Rational];

interface ExifOptions {
  bigEndian?: boolean;
  gps?: { latRef: string; lat: Dms; lngRef: string; lng: Dms };
  dateTimeOriginal?: string;
  offsetTimeOriginal?: string;
}

/** EXIF（TIFF）を組み立てる。IFD0 → Exif IFD（日時）と GPS IFD（位置） */
function exif(options: ExifOptions): number[] {
  const le = !options.bigEndian;
  const u16 = (v: number) => (le ? [v & 255, (v >> 8) & 255] : [(v >> 8) & 255, v & 255]);
  const u32 = (v: number) =>
    le
      ? [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255]
      : [(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255];
  const ifdSize = (n: number) => 2 + 12 * n + 4;
  const ASCII = 2;
  const LONG = 4;
  const RATIONAL = 5;

  const exifTags: { tag: number; text: string }[] = [];
  if (options.dateTimeOriginal !== undefined) exifTags.push({ tag: 0x9003, text: options.dateTimeOriginal });
  if (options.offsetTimeOriginal !== undefined) exifTags.push({ tag: 0x9011, text: options.offsetTimeOriginal });
  const gps = options.gps;
  const n0 = (exifTags.length > 0 ? 1 : 0) + (gps ? 1 : 0);

  const offIfd0 = 8;
  const offExif = offIfd0 + ifdSize(n0);
  const offGps = offExif + (exifTags.length > 0 ? ifdSize(exifTags.length) : 0);
  let offData = offGps + (gps ? ifdSize(4) : 0);
  const data: number[] = [];
  const put = (bytes: number[]) => {
    const at = offData;
    data.push(...bytes);
    offData += bytes.length;
    return at;
  };
  const entry = (tag: number, type: number, count: number, value: number[]) => [
    ...u16(tag),
    ...u16(type),
    ...u32(count),
    ...value,
  ];
  const inline = (bytes: number[]) => [...bytes, 0, 0, 0, 0].slice(0, 4);
  const rationals = (dms: Dms) => dms.flatMap(([n, d]) => [...u32(n), ...u32(d)]);

  const ifd0: number[] = [...u16(n0)];
  if (exifTags.length > 0) ifd0.push(...entry(0x8769, LONG, 1, u32(offExif)));
  if (gps) ifd0.push(...entry(0x8825, LONG, 1, u32(offGps)));
  ifd0.push(...u32(0));

  const exifIfd: number[] = exifTags.length > 0 ? [...u16(exifTags.length)] : [];
  for (const t of exifTags) {
    const bytes = [...ascii(t.text), 0];
    exifIfd.push(...entry(t.tag, ASCII, bytes.length, bytes.length <= 4 ? inline(bytes) : u32(put(bytes))));
  }
  if (exifTags.length > 0) exifIfd.push(...u32(0));

  const gpsIfd: number[] = [];
  if (gps) {
    gpsIfd.push(...u16(4));
    gpsIfd.push(...entry(0x0001, ASCII, 2, inline([...ascii(gps.latRef), 0])));
    gpsIfd.push(...entry(0x0002, RATIONAL, 3, u32(put(rationals(gps.lat)))));
    gpsIfd.push(...entry(0x0003, ASCII, 2, inline([...ascii(gps.lngRef), 0])));
    gpsIfd.push(...entry(0x0004, RATIONAL, 3, u32(put(rationals(gps.lng)))));
    gpsIfd.push(...u32(0));
  }

  const header = [...ascii(le ? "II" : "MM"), ...u16(42), ...u32(offIfd0)];
  return app1([...ascii("Exif"), 0, 0, ...header, ...ifd0, ...exifIfd, ...gpsIfd, ...data]);
}

/** 度・分・秒（秒は 1/100 単位） */
function dms(deg: number, min: number, sec100: number): Dms {
  return [
    [deg, 1],
    [min, 1],
    [sec100, 100],
  ];
}

// 北緯 41°48'25.20" ＝ 41.807、東経 144°30'36.00" ＝ 144.51（架空の範囲の中）
const LAT_DMS = dms(41, 48, 2520);
const LNG_DMS = dms(144, 30, 3600);

describe("readPhotoMeta: XMP（DJI のドローン）", () => {
  it("属性の書き方から位置と撮影日を読む", () => {
    const bytes = jpeg(
      djiXmp({
        "drone-dji:GpsLatitude": "41.807",
        "drone-dji:GpsLongitude": "144.51",
        "xmp:CreateDate": "2026-07-21T10:15:30",
      }),
    );
    expect(readPhotoMeta(bytes)).toEqual({
      position: { lat: 41.807, lng: 144.51 },
      takenAt: "2026-07-21",
      takenAtSource: "xmp",
    });
  });

  it("要素の書き方からも読む", () => {
    const bytes = jpeg(
      xmp(
        `<rdf:Description><drone-dji:GpsLatitude>41.807</drone-dji:GpsLatitude>` +
          `<drone-dji:GpsLongitude>144.51</drone-dji:GpsLongitude>` +
          `<xmp:CreateDate>2026-07-21T10:15:30</xmp:CreateDate></rdf:Description>`,
      ),
    );
    expect(readPhotoMeta(bytes).position).toEqual({ lat: 41.807, lng: 144.51 });
    expect(readPhotoMeta(bytes).takenAt).toBe("2026-07-21");
  });

  it("綴り違いの GpsLongtitude も経度として読む（機種による）", () => {
    const bytes = jpeg(djiXmp({ "drone-dji:GpsLatitude": "+41.807", "drone-dji:GpsLongtitude": "+144.51" }));
    expect(readPhotoMeta(bytes).position).toEqual({ lat: 41.807, lng: 144.51 });
  });

  it("南緯・西経はマイナスのまま読む", () => {
    const bytes = jpeg(djiXmp({ "drone-dji:GpsLatitude": "-33.5", "drone-dji:GpsLongitude": "-70.25" }));
    expect(readPhotoMeta(bytes).position).toEqual({ lat: -33.5, lng: -70.25 });
  });

  it("時差つきの日時は日本時間の日付にする（UTC の 20 時は翌日）", () => {
    const bytes = jpeg(djiXmp({ "xmp:CreateDate": "2026-07-20T20:30:00Z" }));
    expect(readPhotoMeta(bytes)).toMatchObject({ takenAt: "2026-07-21", takenAtSource: "xmp" });
  });

  it("+09:00 の日時はその日のまま", () => {
    const bytes = jpeg(djiXmp({ "xmp:CreateDate": "2026-07-21T23:59:00+09:00" }));
    expect(readPhotoMeta(bytes).takenAt).toBe("2026-07-21");
  });
});

describe("readPhotoMeta: EXIF（スマホ）", () => {
  it("GPS と DateTimeOriginal から位置と撮影日を読む", () => {
    const bytes = jpeg(
      exif({ gps: { latRef: "N", lat: LAT_DMS, lngRef: "E", lng: LNG_DMS }, dateTimeOriginal: "2026:07:21 10:15:30" }),
    );
    const meta = readPhotoMeta(bytes);
    expect(meta.position?.lat).toBeCloseTo(41.807, 6);
    expect(meta.position?.lng).toBeCloseTo(144.51, 6);
    expect(meta.takenAt).toBe("2026-07-21");
    expect(meta.takenAtSource).toBe("exif");
  });

  it("南（S）・西（W）はマイナスにする", () => {
    const bytes = jpeg(exif({ gps: { latRef: "S", lat: LAT_DMS, lngRef: "W", lng: LNG_DMS } }));
    const meta = readPhotoMeta(bytes);
    expect(meta.position?.lat).toBeCloseTo(-41.807, 6);
    expect(meta.position?.lng).toBeCloseTo(-144.51, 6);
  });

  it("ビッグエンディアン（MM）でも読む", () => {
    const bytes = jpeg(
      exif({
        bigEndian: true,
        gps: { latRef: "N", lat: LAT_DMS, lngRef: "E", lng: LNG_DMS },
        dateTimeOriginal: "2026:07:21 10:15:30",
      }),
    );
    const meta = readPhotoMeta(bytes);
    expect(meta.position?.lat).toBeCloseTo(41.807, 6);
    expect(meta.takenAt).toBe("2026-07-21");
  });

  it("0/0（分母が 0 で NaN）の位置は null（Android の Chrome は位置を 0/0 に消す）", () => {
    const zero: Dms = [
      [0, 0],
      [0, 0],
      [0, 0],
    ];
    const bytes = jpeg(exif({ gps: { latRef: "N", lat: zero, lngRef: "E", lng: zero } }));
    expect(readPhotoMeta(bytes).position).toBeNull();
  });

  it("0,0（緯度も経度も 0）の位置は null（消されているとみなす）", () => {
    const bytes = jpeg(exif({ gps: { latRef: "N", lat: dms(0, 0, 0), lngRef: "E", lng: dms(0, 0, 0) } }));
    expect(readPhotoMeta(bytes).position).toBeNull();
  });

  it("OffsetTimeOriginal があれば日本時間の日付にする", () => {
    const bytes = jpeg(exif({ dateTimeOriginal: "2026:07:20 22:00:00", offsetTimeOriginal: "-05:00" }));
    expect(readPhotoMeta(bytes)).toMatchObject({ takenAt: "2026-07-21", takenAtSource: "exif" });
  });

  it("あり得ない日時は不明として扱う（推測しない）", () => {
    const bytes = jpeg(exif({ dateTimeOriginal: "2026:13:45 10:00:00" }));
    expect(readPhotoMeta(bytes)).toMatchObject({ takenAt: null, takenAtSource: "none" });
  });
});

describe("readPhotoMeta: XMP と EXIF の両方があるとき（11-03 本人決定: XMP を優先）", () => {
  it("両方に位置があれば XMP の位置", () => {
    const bytes = jpeg(
      exif({ gps: { latRef: "N", lat: dms(41, 48, 0), lngRef: "E", lng: dms(144, 30, 0) } }),
      djiXmp({ "drone-dji:GpsLatitude": "41.807", "drone-dji:GpsLongitude": "144.51" }),
    );
    expect(readPhotoMeta(bytes).position).toEqual({ lat: 41.807, lng: 144.51 });
  });

  it("位置と日付は別々に選ぶ（XMP に日時が無ければ EXIF の日時）", () => {
    const bytes = jpeg(
      exif({ dateTimeOriginal: "2026:07:19 08:00:00" }),
      djiXmp({ "drone-dji:GpsLatitude": "41.807", "drone-dji:GpsLongitude": "144.51" }),
    );
    expect(readPhotoMeta(bytes)).toEqual({
      position: { lat: 41.807, lng: 144.51 },
      takenAt: "2026-07-19",
      takenAtSource: "exif",
    });
  });

  it("XMP の値が数でなければ EXIF の位置を使う", () => {
    const bytes = jpeg(
      exif({ gps: { latRef: "N", lat: LAT_DMS, lngRef: "E", lng: LNG_DMS } }),
      djiXmp({ "drone-dji:GpsLatitude": "abc", "drone-dji:GpsLongitude": "144.51" }),
    );
    expect(readPhotoMeta(bytes).position?.lat).toBeCloseTo(41.807, 6);
  });
});

describe("readPhotoMeta: 取れないとき（例外を出さず、位置なし・日付不明。11-03 本人決定）", () => {
  const none = { position: null, takenAt: null, takenAtSource: "none" };

  it("APP1 の無い JPEG", () => {
    expect(readPhotoMeta(jpeg())).toEqual(none);
  });

  it("JPEG ではないバイト列", () => {
    expect(readPhotoMeta(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]))).toEqual(none);
  });

  it("空のバイト列", () => {
    expect(readPhotoMeta(new Uint8Array())).toEqual(none);
  });

  it("途中で切れた JPEG（APP1 の長さがファイルの終わりを越える）", () => {
    const full = jpeg(exif({ dateTimeOriginal: "2026:07:21 10:15:30" }));
    expect(readPhotoMeta(full.subarray(0, 20))).toEqual(none);
  });

  it("緯度か経度の片方しか無ければ位置は null", () => {
    const bytes = jpeg(djiXmp({ "drone-dji:GpsLatitude": "41.807" }));
    expect(readPhotoMeta(bytes).position).toBeNull();
  });

  it("範囲の外（緯度 95）の位置は null", () => {
    const bytes = jpeg(djiXmp({ "drone-dji:GpsLatitude": "95", "drone-dji:GpsLongitude": "144.51" }));
    expect(readPhotoMeta(bytes).position).toBeNull();
  });

  it("NaN の文字の位置は null（PR #38 の申し送り）", () => {
    const bytes = jpeg(djiXmp({ "drone-dji:GpsLatitude": "NaN", "drone-dji:GpsLongitude": "NaN" }));
    expect(readPhotoMeta(bytes).position).toBeNull();
  });
});
