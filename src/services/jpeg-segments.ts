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

export function inspectJpeg(bytes: Uint8Array): JpegInfo {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    throw new InvalidJpegError("JPEG ではない（SOI が無い）");
  }
  throw new Error("not implemented");
}
