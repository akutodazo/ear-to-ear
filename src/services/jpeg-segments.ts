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

/** 長さの欄を持たないマーカー。SOS より前に出てくるのは壊れた JPEG */
function isStandaloneMarker(marker: number): boolean {
  return marker < 0xc0 || (marker >= 0xd0 && marker <= 0xd9);
}

export function inspectJpeg(bytes: Uint8Array): JpegInfo {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    throw new InvalidJpegError("JPEG ではない（SOI が無い）");
  }

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

    if (marker === SOS) {
      throw new InvalidJpegError("SOF が無い");
    }
    offset = start + length;
  }
}
