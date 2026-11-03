/**
 * JPEG のセグメントの見出しだけをたどる（docs/spec.md §技術）。
 * Worker の CPU 10ms に収めるためデコードはせず、最初の SOS（画像データの開始）で止まる。
 * scripts/ の安全検査からも使うので、他のファイルを import しない。
 */

/** JPEG ではない、または壊れていて見出しをたどれない */
export class InvalidJpegError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidJpegError";
  }
}

export interface JpegInfo {
  width: number;
  height: number;
  /** 見つかった APP の番号（1〜15）を出てきた順に。APP0（JFIF）は入れない */
  appSegments: number[];
}

const SOS = 0xda;
const APP0 = 0xe0;
const APP15 = 0xef;

/** 長さの欄を持たないマーカー。SOS より前に出てくるのは壊れた JPEG */
function isStandaloneMarker(marker: number): boolean {
  return marker < 0xc0 || (marker >= 0xd0 && marker <= 0xd9);
}

/** C0〜CF のうち C4（DHT）・C8（JPG）・CC（DAC）は SOF ではない */
function isSof(marker: number): boolean {
  return (
    marker >= 0xc0 &&
    marker <= 0xcf &&
    marker !== 0xc4 &&
    marker !== 0xc8 &&
    marker !== 0xcc
  );
}

/** 中身は 精度1・高さ2・幅2 の順 */
function readSize(
  bytes: Uint8Array,
  start: number,
  length: number,
): { width: number; height: number } {
  if (length < 7) {
    throw new InvalidJpegError("SOF の中身が短い");
  }
  const height = (bytes[start + 3] << 8) | bytes[start + 4];
  const width = (bytes[start + 5] << 8) | bytes[start + 6];
  if (width === 0 || height === 0) {
    throw new InvalidJpegError("幅または高さが 0");
  }
  return { width, height };
}

export function inspectJpeg(bytes: Uint8Array): JpegInfo {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    throw new InvalidJpegError("JPEG ではない（SOI が無い）");
  }

  let size: { width: number; height: number } | null = null;
  const appSegments: number[] = [];
  let offset = 2;
  while (true) {
    if (bytes[offset] !== 0xff) {
      throw new InvalidJpegError(`マーカーが無い（位置 ${offset}）`);
    }
    // マーカーの前の 0xFF は詰め物
    while (bytes[offset] === 0xff) offset++;

    const marker = bytes[offset];
    if (isStandaloneMarker(marker)) {
      throw new InvalidJpegError(`SOS の前に不正なマーカー（位置 ${offset}）`);
    }

    const start = offset + 1;
    if (start + 2 > bytes.length) {
      throw new InvalidJpegError("長さの欄の途中で切れている");
    }
    // 長さの欄は自分の2バイトを含む
    const length = (bytes[start] << 8) | bytes[start + 1];
    if (length < 2 || start + length > bytes.length) {
      throw new InvalidJpegError(`セグメントの長さが不正（位置 ${offset}）`);
    }

    if (marker > APP0 && marker <= APP15) {
      appSegments.push(marker - APP0);
    }
    if (isSof(marker)) {
      size = readSize(bytes, start, length);
    }
    if (marker === SOS) {
      if (size === null) {
        throw new InvalidJpegError("SOF が無い");
      }
      return { ...size, appSegments };
    }
    offset = start + length;
  }
}

export interface JpegScan {
  /** ファイル全体（最初のスキャンの後ろを含む）で見つかった APP の番号（1〜15） */
  appSegments: number[];
  /** 最初の EOI でちょうど終わるか。EOI が無い・後ろに付け足し・壊れた形は false */
  endsAtEoi: boolean;
}

const EOI = 0xd9;

/**
 * 最初のスキャンの後ろまでセグメントをたどる。例外は出さない。
 * セグメントの中身は長さで飛ばす（DQT・DHT の中の FF E1 を APP と見誤らない）。
 * スキャンの中の FF は FF 00（詰め物）・FF D0〜D7（RST）・FF FF（詰め物）だけなので、それ以外の FF が次のマーカー。
 * FF は indexOf で探す（3MB を 1 バイトずつ JS で回さない）
 */
export function scanJpegMarkers(bytes: Uint8Array): JpegScan {
  const appSegments: number[] = [];
  const broken: JpegScan = { appSegments, endsAtEoi: false };
  const n = bytes.length;
  if (n < 2 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return broken;
  let offset = 2;
  while (offset < n) {
    if (bytes[offset] !== 0xff) return broken;
    while (offset < n && bytes[offset] === 0xff) offset++;
    if (offset >= n) return broken;
    const marker = bytes[offset];
    if (marker === EOI) return { appSegments, endsAtEoi: offset + 1 === n };
    if (isStandaloneMarker(marker)) return broken;
    const start = offset + 1;
    if (start + 2 > n) return broken;
    const length = (bytes[start] << 8) | bytes[start + 1];
    if (length < 2 || start + length > n) return broken;
    if (marker > APP0 && marker <= APP15) appSegments.push(marker - APP0);
    offset = start + length;
    if (marker !== SOS) continue;
    // スキャンの中身: 詰め物と RST を飛ばして、次のマーカーの FF まで進む
    for (;;) {
      const ff = bytes.indexOf(0xff, offset);
      if (ff === -1 || ff + 1 >= n) return broken;
      const next = bytes[ff + 1];
      if (next === 0x00 || (next >= 0xd0 && next <= 0xd7)) {
        offset = ff + 2;
      } else if (next === 0xff) {
        offset = ff + 1;
      } else {
        offset = ff;
        break;
      }
    }
  }
  return broken;
}
