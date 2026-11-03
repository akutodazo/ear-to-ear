/**
 * 写真（JPEG）の XMP と EXIF から、撮影位置と撮影日を読む（docs/spec.md §4「写真の位置情報」、T01）。純粋関数。
 * 撮影位置は端末の中だけで使い、送らない・保存しない（K6）。日付は日本時間の 'YYYY-MM-DD'。
 * XMP（DJI のドローン）を EXIF（スマホ）より優先し、位置と日付はそれぞれ別に選ぶ。
 * 読めない・壊れている・値がおかしいときは例外を出さず「位置なし・日付不明」（推測しない）。
 */
import type { TakenAtSource } from "@/types";
import type { LatLng } from "./candidates";

export interface PhotoMeta {
  /** 撮影位置。取れない・0/0（NaN）・0,0・範囲外は null */
  position: LatLng | null;
  /** 'YYYY-MM-DD'（日本時間）。不明は null */
  takenAt: string | null;
  /** takenAt の出どころ。不明は "none" */
  takenAtSource: TakenAtSource;
}

interface Found {
  position: LatLng | null;
  takenAt: string | null;
}

const NOTHING: Found = { position: null, takenAt: null };
const XMP_HEADER = "http://ns.adobe.com/xap/1.0/\0";
const EXIF_HEADER = "Exif\0\0";
const JST_OFFSET_MINUTES = 9 * 60;

export function readPhotoMeta(bytes: Uint8Array): PhotoMeta {
  let fromXmp: Found = NOTHING;
  let fromExif: Found = NOTHING;
  try {
    for (const payload of app1Payloads(bytes)) {
      if (startsWith(payload, XMP_HEADER)) {
        fromXmp = merge(fromXmp, readXmp(asciiText(payload.subarray(XMP_HEADER.length))));
      } else if (startsWith(payload, EXIF_HEADER)) {
        fromExif = merge(fromExif, safeReadExif(payload.subarray(EXIF_HEADER.length)));
      }
    }
  } catch {
    return { position: null, takenAt: null, takenAtSource: "none" };
  }

  const position = fromXmp.position ?? fromExif.position;
  if (fromXmp.takenAt !== null) return { position, takenAt: fromXmp.takenAt, takenAtSource: "xmp" };
  if (fromExif.takenAt !== null) return { position, takenAt: fromExif.takenAt, takenAtSource: "exif" };
  return { position, takenAt: null, takenAtSource: "none" };
}

/** 先に見つかった値を残し、空いているところだけ埋める */
function merge(current: Found, next: Found): Found {
  return {
    position: current.position ?? next.position,
    takenAt: current.takenAt ?? next.takenAt,
  };
}

// ---- JPEG のセグメント ----

/** SOS か EOI まで、セグメントの見出しだけをたどって APP1 の中身を集める。壊れていればそこで止める */
function app1Payloads(bytes: Uint8Array): Uint8Array[] {
  const result: Uint8Array[] = [];
  if (bytes.length < 2 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return result;
  let pos = 2;
  while (pos + 1 < bytes.length) {
    if (bytes[pos] !== 0xff) return result;
    const marker = bytes[pos + 1];
    if (marker === 0xff) {
      pos += 1; // 詰め物の FF
      continue;
    }
    if (marker === 0xda || marker === 0xd9) return result;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      pos += 2; // 長さを持たないマーカー
      continue;
    }
    if (pos + 3 >= bytes.length) return result;
    const length = (bytes[pos + 2] << 8) | bytes[pos + 3];
    const end = pos + 2 + length;
    if (length < 2 || end > bytes.length) return result;
    if (marker === 0xe1) result.push(bytes.subarray(pos + 4, end));
    pos = end;
  }
  return result;
}

function startsWith(bytes: Uint8Array, text: string): boolean {
  if (bytes.length < text.length) return false;
  for (let i = 0; i < text.length; i++) {
    if (bytes[i] !== text.charCodeAt(i)) return false;
  }
  return true;
}

/** 読みたい値はすべて ASCII なので、1 バイト 1 文字で読む */
function asciiText(bytes: Uint8Array): string {
  let text = "";
  for (let i = 0; i < bytes.length; i++) text += String.fromCharCode(bytes[i]);
  return text;
}

// ---- 位置と日付の確かめ ----

function validPosition(lat: number, lng: number): LatLng | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat === 0 && lng === 0) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

/** 数字だけの10進数（符号は可）。"abc"・"NaN"・空は NaN */
function parseDecimal(text: string | null): number {
  if (text === null) return Number.NaN;
  const trimmed = text.trim();
  if (!/^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(trimmed)) return Number.NaN;
  return Number(trimmed);
}

/**
 * 日時を日本時間の 'YYYY-MM-DD' にする。offsetMinutes が null なら日本時間とみなす。
 * あり得ない日時は null（Date.UTC の往復で確かめる）
 */
function toJstDate(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  offsetMinutes: number | null,
): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  if (hour > 23 || minute > 59 || second > 60) return null;
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;
  const offset = offsetMinutes ?? JST_OFFSET_MINUTES;
  const utc = Date.UTC(year, month - 1, day, hour, minute, second) - offset * 60_000;
  const jst = new Date(utc + JST_OFFSET_MINUTES * 60_000);
  const y = jst.getUTCFullYear();
  if (y < 1 || y > 9999) return null;
  return `${String(y).padStart(4, "0")}-${pad2(jst.getUTCMonth() + 1)}-${pad2(jst.getUTCDate())}`;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** "Z"・"+09:00"・"+0900"・"-05:00" を分にする。読めなければ undefined */
function parseOffset(text: string): number | undefined {
  if (text === "Z") return 0;
  const m = /^([+-])(\d{2}):?(\d{2})$/.exec(text);
  if (!m) return undefined;
  const hours = Number(m[2]);
  const minutes = Number(m[3]);
  if (hours > 14 || minutes > 59) return undefined;
  return (m[1] === "-" ? -1 : 1) * (hours * 60 + minutes);
}

// ---- XMP ----

function readXmp(xml: string): Found {
  const lat = parseDecimal(xmpValue(xml, "drone-dji:GpsLatitude"));
  const lngText = xmpValue(xml, "drone-dji:GpsLongitude") ?? xmpValue(xml, "drone-dji:GpsLongtitude");
  const lng = parseDecimal(lngText);
  const created = xmpValue(xml, "xmp:CreateDate");
  return {
    position: validPosition(lat, lng),
    takenAt: created === null ? null : parseXmpDate(created.trim()),
  };
}

/** 属性（name="値"）か要素（<name>値</name>）の書き方で値を取る */
function xmpValue(xml: string, name: string): string | null {
  const escaped = name.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&");
  const attr = new RegExp(`(?:^|[\\s<])${escaped}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`).exec(xml);
  if (attr) return attr[1] ?? attr[2] ?? null;
  const element = new RegExp(`<${escaped}(?:\\s[^>]*)?>([^<]*)</${escaped}\\s*>`).exec(xml);
  if (element) return element[1];
  return null;
}

/** 'YYYY-MM-DD'、'YYYY-MM-DDThh:mm[:ss[.s]][Z|±hh:mm]' */
function parseXmpDate(text: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/.exec(text);
  if (!m) return null;
  let offset: number | null = null;
  if (m[7] !== undefined) {
    const parsed = parseOffset(m[7]);
    if (parsed === undefined) return null;
    offset = parsed;
  }
  return toJstDate(
    Number(m[1]),
    Number(m[2]),
    Number(m[3]),
    Number(m[4] ?? "0"),
    Number(m[5] ?? "0"),
    Number(m[6] ?? "0"),
    offset,
  );
}

// ---- EXIF（TIFF） ----

const TAG_EXIF_IFD = 0x8769;
const TAG_GPS_IFD = 0x8825;
const TAG_DATE_TIME_ORIGINAL = 0x9003;
const TAG_OFFSET_TIME_ORIGINAL = 0x9011;
const TAG_GPS_LAT_REF = 0x0001;
const TAG_GPS_LAT = 0x0002;
const TAG_GPS_LNG_REF = 0x0003;
const TAG_GPS_LNG = 0x0004;
const TYPE_ASCII = 2;
const TYPE_LONG = 4;
const TYPE_RATIONAL = 5;
const MAX_IFD_ENTRIES = 1000;

interface IfdEntry {
  type: number;
  count: number;
  /** 値の4バイトの欄の位置（TIFF の先頭から） */
  fieldAt: number;
}

class Tiff {
  private readonly view: DataView;
  private readonly little: boolean;

  constructor(private readonly bytes: Uint8Array) {
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const order = asciiText(bytes.subarray(0, 2));
    if (order === "II") this.little = true;
    else if (order === "MM") this.little = false;
    else throw new RangeError("not TIFF");
    if (this.u16(2) !== 42) throw new RangeError("not TIFF");
  }

  get firstIfd(): number {
    return this.u32(4);
  }

  u16(at: number): number {
    return this.view.getUint16(at, this.little);
  }

  u32(at: number): number {
    return this.view.getUint32(at, this.little);
  }

  ifd(at: number): Map<number, IfdEntry> {
    const entries = new Map<number, IfdEntry>();
    const n = this.u16(at);
    if (n > MAX_IFD_ENTRIES) throw new RangeError("too many entries");
    for (let i = 0; i < n; i++) {
      const e = at + 2 + 12 * i;
      const tag = this.u16(e);
      if (!entries.has(tag)) entries.set(tag, { type: this.u16(e + 2), count: this.u32(e + 4), fieldAt: e + 8 });
    }
    return entries;
  }

  /** 値の置き場所（4バイト以下ならその欄、超えればオフセットの先） */
  private dataAt(entry: IfdEntry, unitSize: number): number {
    const size = entry.count * unitSize;
    const at = size <= 4 ? entry.fieldAt : this.u32(entry.fieldAt);
    if (at + size > this.bytes.length) throw new RangeError("out of range");
    return at;
  }

  ascii(entry: IfdEntry | undefined): string | null {
    if (!entry || entry.type !== TYPE_ASCII) return null;
    const at = this.dataAt(entry, 1);
    const text = asciiText(this.bytes.subarray(at, at + entry.count));
    const nul = text.indexOf("\0");
    return nul === -1 ? text : text.slice(0, nul);
  }

  long(entry: IfdEntry | undefined): number | null {
    if (!entry || entry.type !== TYPE_LONG || entry.count < 1) return null;
    return this.u32(this.dataAt(entry, 4));
  }

  /** 有理数の並び。分母 0 は NaN */
  rationals(entry: IfdEntry | undefined, count: number): number[] | null {
    if (!entry || entry.type !== TYPE_RATIONAL || entry.count < count) return null;
    const at = this.dataAt(entry, 8);
    const values: number[] = [];
    for (let i = 0; i < count; i++) {
      const num = this.u32(at + 8 * i);
      const den = this.u32(at + 8 * i + 4);
      values.push(den === 0 ? Number.NaN : num / den);
    }
    return values;
  }
}

/** EXIF の位置と日付は別々に読み、片方が壊れていてももう片方は使う */
function safeReadExif(tiffBytes: Uint8Array): Found {
  let tiff: Tiff;
  let ifd0: Map<number, IfdEntry>;
  try {
    tiff = new Tiff(tiffBytes);
    ifd0 = tiff.ifd(tiff.firstIfd);
  } catch {
    return NOTHING;
  }
  return {
    position: attempt(() => readExifPosition(tiff, ifd0)),
    takenAt: attempt(() => readExifDate(tiff, ifd0)),
  };
}

function attempt<T>(read: () => T | null): T | null {
  try {
    return read();
  } catch {
    return null;
  }
}

function readExifPosition(tiff: Tiff, ifd0: Map<number, IfdEntry>): LatLng | null {
  const gpsAt = tiff.long(ifd0.get(TAG_GPS_IFD));
  if (gpsAt === null) return null;
  const gps = tiff.ifd(gpsAt);
  const latRef = tiff.ascii(gps.get(TAG_GPS_LAT_REF))?.trim().toUpperCase();
  const lngRef = tiff.ascii(gps.get(TAG_GPS_LNG_REF))?.trim().toUpperCase();
  const lat = tiff.rationals(gps.get(TAG_GPS_LAT), 3);
  const lng = tiff.rationals(gps.get(TAG_GPS_LNG), 3);
  if (!lat || !lng) return null;
  if (latRef !== "N" && latRef !== "S") return null;
  if (lngRef !== "E" && lngRef !== "W") return null;
  const latAbs = lat[0] + lat[1] / 60 + lat[2] / 3600;
  const lngAbs = lng[0] + lng[1] / 60 + lng[2] / 3600;
  return validPosition(latRef === "S" ? -latAbs : latAbs, lngRef === "W" ? -lngAbs : lngAbs);
}

function readExifDate(tiff: Tiff, ifd0: Map<number, IfdEntry>): string | null {
  const exifAt = tiff.long(ifd0.get(TAG_EXIF_IFD));
  if (exifAt === null) return null;
  const exifIfd = tiff.ifd(exifAt);
  const original = tiff.ascii(exifIfd.get(TAG_DATE_TIME_ORIGINAL));
  if (original === null) return null;
  const m = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(original.trim());
  if (!m) return null;
  let offset: number | null = null;
  const offsetText = tiff.ascii(exifIfd.get(TAG_OFFSET_TIME_ORIGINAL));
  if (offsetText !== null && offsetText.trim() !== "") {
    const parsed = parseOffset(offsetText.trim());
    if (parsed === undefined) return null;
    offset = parsed;
  }
  return toJstDate(Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4]), Number(m[5]), Number(m[6]), offset);
}
