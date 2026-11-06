/**
 * 合成写真（T10、docs/spec.md §10）の一覧と組み立て。純粋関数。書き出しは scripts/make-fixtures.mjs。
 * 種類: XMP 位置あり／EXIF 位置あり／位置が 0/0／位置なし／日時なし／APP2 付き／壊れた画像／同じ内容の重複。
 * 位置はすべて架空の範囲（P15）の中。実写真・実在の座標は使わない（K10）。出力はコミットしない（/private/fixtures/）。
 */
import type { RgbImage } from "./jpeg-encoder";

/** 端末で送ったときに出るはずのもの */
export interface FixtureExpectation {
  /** 一番近い候補の圃場。位置が取れないときは null */
  nearestFieldId: string | null;
  /** 撮影日（日本時間）。不明は null */
  takenAt: string | null;
  takenAtSource: "xmp" | "exif" | "none";
  /** 壊れていて送れない */
  broken: boolean;
}

export interface Fixture {
  /** ファイル名（例 01-xmp-A06.jpg） */
  name: string;
  /** 何を確かめる写真か（README に出す） */
  purpose: string;
  expect: FixtureExpectation;
  bytes: Uint8Array;
}

export interface DmsPosition {
  lat: number;
  lng: number;
}

const encoder = new TextEncoder();

function concat(parts: (Uint8Array | number[])[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

/** DJI の XMP（drone-dji:GpsLatitude など）の APP1 の中身（"http://ns.adobe.com/xap/1.0/\0" から） */
export function xmpPayload(options: { position?: DmsPosition; createDate?: string }): Uint8Array {
  const attrs: string[] = [];
  if (options.position) {
    attrs.push(`drone-dji:GpsLatitude="${options.position.lat.toFixed(6)}"`);
    attrs.push(`drone-dji:GpsLongitude="${options.position.lng.toFixed(6)}"`);
  }
  if (options.createDate !== undefined) attrs.push(`xmp:CreateDate="${options.createDate}"`);
  const xml =
    `<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">` +
    `<rdf:Description xmlns:drone-dji="http://www.dji.com/drone-dji/1.0/" xmlns:xmp="http://ns.adobe.com/xap/1.0/" ` +
    `${attrs.join(" ")}/></rdf:RDF></x:xmpmeta>`;
  return concat([encoder.encode("http://ns.adobe.com/xap/1.0/\0"), encoder.encode(xml)]);
}

/** 10 進の度を、度・分・秒（秒は 1/10000 単位）の有理数3つに */
function toDms(degrees: number): [number, number][] {
  const abs = Math.abs(degrees);
  const d = Math.floor(abs);
  const minutes = (abs - d) * 60;
  const m = Math.floor(minutes);
  const s = Math.round((minutes - m) * 60 * 10000);
  return [
    [d, 1],
    [m, 1],
    [s, 10000],
  ];
}

/** EXIF（TIFF、リトルエンディアン）の APP1 の中身（"Exif\0\0" から）。位置は度分秒の有理数で書く */
export function exifPayload(options: {
  /** "erased" は 0/0（Android の Chrome が消した形） */
  position?: DmsPosition | "erased";
  dateTimeOriginal?: string;
  offsetTimeOriginal?: string;
}): Uint8Array {
  const u16 = (v: number) => [v & 255, (v >> 8) & 255];
  const u32 = (v: number) => [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255];
  const ifdSize = (n: number) => 2 + 12 * n + 4;
  const ASCII = 2;
  const LONG = 4;
  const RATIONAL = 5;

  const exifTags: { tag: number; text: string }[] = [];
  if (options.dateTimeOriginal !== undefined) exifTags.push({ tag: 0x9003, text: options.dateTimeOriginal });
  if (options.offsetTimeOriginal !== undefined) exifTags.push({ tag: 0x9011, text: options.offsetTimeOriginal });
  const position = options.position;
  const ifd0Count = (exifTags.length > 0 ? 1 : 0) + (position ? 1 : 0);

  const offIfd0 = 8;
  const offExif = offIfd0 + ifdSize(ifd0Count);
  const offGps = offExif + (exifTags.length > 0 ? ifdSize(exifTags.length) : 0);
  let offData = offGps + (position ? ifdSize(4) : 0);
  const data: number[] = [];
  const putData = (bytes: number[]) => {
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
  const rationals = (values: [number, number][]) => values.flatMap(([n, d]) => [...u32(n), ...u32(d)]);
  const zero: [number, number][] = [
    [0, 0],
    [0, 0],
    [0, 0],
  ];

  const ifd0: number[] = [...u16(ifd0Count)];
  if (exifTags.length > 0) ifd0.push(...entry(0x8769, LONG, 1, u32(offExif)));
  if (position) ifd0.push(...entry(0x8825, LONG, 1, u32(offGps)));
  ifd0.push(...u32(0));

  const exifIfd: number[] = exifTags.length > 0 ? [...u16(exifTags.length)] : [];
  for (const t of exifTags) {
    const bytes = [...encoder.encode(t.text), 0];
    exifIfd.push(...entry(t.tag, ASCII, bytes.length, bytes.length <= 4 ? inline(bytes) : u32(putData(bytes))));
  }
  if (exifTags.length > 0) exifIfd.push(...u32(0));

  const gpsIfd: number[] = [];
  if (position) {
    const erased = position === "erased";
    const lat = erased ? zero : toDms(position.lat);
    const lng = erased ? zero : toDms(position.lng);
    const latRef = erased || position.lat >= 0 ? "N" : "S";
    const lngRef = erased || position.lng >= 0 ? "E" : "W";
    gpsIfd.push(...u16(4));
    gpsIfd.push(...entry(0x0001, ASCII, 2, inline([latRef.charCodeAt(0), 0])));
    gpsIfd.push(...entry(0x0002, RATIONAL, 3, u32(putData(rationals(lat)))));
    gpsIfd.push(...entry(0x0003, ASCII, 2, inline([lngRef.charCodeAt(0), 0])));
    gpsIfd.push(...entry(0x0004, RATIONAL, 3, u32(putData(rationals(lng)))));
    gpsIfd.push(...u32(0));
  }

  const header = [0x49, 0x49, ...u16(42), ...u32(offIfd0)];
  return concat([encoder.encode("Exif\0\0"), header, ifd0, exifIfd, gpsIfd, data]);
}

/** 色の情報（ICC）の APP2 の中身。Chrome の再エンコードが付けるものに似せた、中身の無い形だけのもの */
export function iccPayload(): Uint8Array {
  // "ICC_PROFILE\0"、通し番号 1、全体の数 1、続いて 128 バイトの空のヘッダー
  return concat([encoder.encode("ICC_PROFILE\0"), [1, 1], new Uint8Array(128)]);
}

/** SOI の直後に APP のセグメントを差し込む */
export function withAppSegments(jpeg: Uint8Array, segments: { marker: number; payload: Uint8Array }[]): Uint8Array {
  const parts: (Uint8Array | number[])[] = [jpeg.subarray(0, 2)];
  for (const { marker, payload } of segments) {
    const length = payload.length + 2;
    if (length > 0xffff) throw new RangeError("APP の中身は 65533 バイトまで");
    parts.push([0xff, marker, length >> 8, length & 0xff], payload);
  }
  parts.push(jpeg.subarray(2));
  return concat(parts);
}

/** 3×5 の数字（端末で写真を見分ける番号） */
const DIGITS: Record<string, string[]> = {
  "0": ["111", "101", "101", "101", "111"],
  "1": ["010", "110", "010", "010", "111"],
  "2": ["111", "001", "111", "100", "111"],
  "3": ["111", "001", "111", "001", "111"],
  "4": ["101", "101", "111", "001", "001"],
  "5": ["111", "100", "111", "001", "111"],
  "6": ["111", "100", "111", "101", "111"],
  "7": ["111", "001", "001", "001", "001"],
  "8": ["111", "101", "111", "101", "111"],
  "9": ["111", "101", "111", "001", "111"],
};

/** 上から見た麦畑ふうの絵。左上に番号（label の数字）を大きく描く */
export function drawField(width: number, height: number, label: string): RgbImage {
  const data = new Uint8Array(width * height * 3);
  const rowPitch = Math.max(4, Math.round(Math.min(width, height) / 60));
  const border = Math.round(Math.min(width, height) * 0.06);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const at = (y * width + x) * 3;
      let r: number;
      let g: number;
      let b: number;
      if (x < border || y < border || x >= width - border || y >= height - border) {
        // 枕地（畑のふち）は草の緑
        r = 96;
        g = 128;
        b = 64;
      } else {
        // 麦の列（少し斜め）と、ゆるい明るさのむら
        const stripe = Math.floor((x + y * 0.2) / rowPitch) % 2 === 0;
        const shade = Math.round(12 * Math.sin(x / (width / 5)) + 10 * Math.cos(y / (height / 3)));
        r = (stripe ? 214 : 190) + shade;
        g = (stripe ? 178 : 154) + shade;
        b = (stripe ? 92 : 74) + Math.round(shade / 2);
      }
      data[at] = r;
      data[at + 1] = g;
      data[at + 2] = b;
    }
  }

  // 番号: 濃い四角の上に白い数字
  const cell = Math.max(2, Math.round(height / 24));
  const digits = [...label].filter((ch) => DIGITS[ch]);
  const boxWidth = cell * (digits.length * 4 + 1);
  const boxHeight = cell * 7;
  const left = border + cell;
  const top = border + cell;
  for (let y = top; y < Math.min(height, top + boxHeight); y++) {
    for (let x = left; x < Math.min(width, left + boxWidth); x++) {
      const cx = Math.floor((x - left) / cell) - 1;
      const cy = Math.floor((y - top) / cell) - 1;
      const index = Math.floor(cx / 4);
      const glyph = cx >= 0 && cx % 4 < 3 && cy >= 0 && cy < 5 ? DIGITS[digits[index]] : undefined;
      const on = glyph !== undefined && glyph[cy][cx % 4] === "1";
      const at = (y * width + x) * 3;
      data.set(on ? [255, 255, 255] : [40, 48, 56], at);
    }
  }
  return { width, height, data };
}

/** 架空の範囲の中の、圃場の中心から少しずらした位置（候補の一番目がその圃場になる） */
const NEAR_A06: DmsPosition = { lat: 43.2393, lng: 141.7544 };
const NEAR_A03: DmsPosition = { lat: 43.2438, lng: 141.7472 };
const NEAR_A10: DmsPosition = { lat: 43.2396, lng: 141.7451 };
const NEAR_A11: DmsPosition = { lat: 43.2386, lng: 141.7459 };

/** 合成写真の一覧。JPEG の書き出しは引数で受け取る（scripts/ の TS は互いを import しない） */
export function buildFixtures(encode: (image: RgbImage) => Uint8Array): Fixture[] {
  const picture = (label: string, width = 1600, height = 1200) => encode(drawField(width, height, label));
  const app1 = (payload: Uint8Array) => ({ marker: 0xe1, payload });

  const drone = withAppSegments(picture("01", 4000, 3000), [
    app1(xmpPayload({ position: NEAR_A06, createDate: "2026-07-21T10:15:30" })),
  ]);
  const ok = (nearestFieldId: string | null, takenAt: string | null, takenAtSource: FixtureExpectation["takenAtSource"]) => ({
    nearestFieldId,
    takenAt,
    takenAtSource,
    broken: false,
  });

  // 壊れた画像: SOI と量子化表のあと、画像の本体（SOF・SOS）が無いまま終わる
  const whole = picture("07", 64, 48);
  const sofAt = whole.findIndex((b, i) => i > 1 && b === 0xff && whole[i + 1] === 0xc0);

  return [
    {
      name: "01-xmp-A06.jpg",
      purpose: "ドローン（DJI）の写真の形。XMP に位置と撮影日。4000×3000 で、送る前の縮小を確かめる",
      expect: ok("A-06", "2026-07-21", "xmp"),
      bytes: drone,
    },
    {
      name: "02-exif-A03.jpg",
      purpose: "スマホのカメラの形。EXIF に位置（度分秒）と撮影日時（+09:00）。iPhone の Safari で位置が残るか（P2）は実機で",
      expect: ok("A-03", "2026-07-22", "exif"),
      bytes: withAppSegments(picture("02"), [
        app1(
          exifPayload({ position: NEAR_A03, dateTimeOriginal: "2026:07:22 14:05:00", offsetTimeOriginal: "+09:00" }),
        ),
      ]),
    },
    {
      name: "03-exif-zero.jpg",
      purpose: "Android の Chrome が位置を消した形（GPS の値が 0/0）。位置なしとして受け付け、番号は管理者が付ける",
      expect: ok(null, "2026-07-23", "exif"),
      bytes: withAppSegments(picture("03"), [
        app1(exifPayload({ position: "erased", dateTimeOriginal: "2026:07:23 09:00:00", offsetTimeOriginal: "+09:00" })),
      ]),
    },
    {
      name: "04-no-position.jpg",
      purpose: "位置の欄がそもそも無い写真。撮影日だけ出る",
      expect: ok(null, "2026-07-24", "exif"),
      bytes: withAppSegments(picture("04"), [
        app1(exifPayload({ dateTimeOriginal: "2026:07:24 16:30:00", offsetTimeOriginal: "+09:00" })),
      ]),
    },
    {
      name: "05-no-date-A10.jpg",
      purpose: "位置はあるが日時が無い。「日付不明」と出る（推測しない）",
      expect: ok("A-10", null, "none"),
      bytes: withAppSegments(picture("05"), [app1(xmpPayload({ position: NEAR_A10 }))]),
    },
    {
      name: "06-app2-A11.jpg",
      purpose: "色の情報（ICC、APP2）付き。送る前にすべての APP を取り除くので、送った画像に残らない",
      expect: ok("A-11", "2026-07-25", "xmp"),
      bytes: withAppSegments(picture("06"), [
        { marker: 0xe2, payload: iccPayload() },
        app1(xmpPayload({ position: NEAR_A11, createDate: "2026-07-25T08:40:00" })),
      ]),
    },
    {
      name: "07-broken.jpg",
      purpose: "壊れた画像（画像の本体が無い）。読み取りは位置なし・日付不明、送るときに「写真を送る形にできませんでした」",
      expect: { nearestFieldId: null, takenAt: null, takenAtSource: "none", broken: true },
      bytes: whole.slice(0, sofAt),
    },
    {
      name: "08-duplicate-of-01.jpg",
      purpose: "01 と同じ中身（同じハッシュ）。01 の後に送ると「同じ写真はもう送られています」（サーバーで 409）",
      expect: ok("A-06", "2026-07-21", "xmp"),
      bytes: drone.slice(),
    },
  ];
}
