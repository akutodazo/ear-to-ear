/**
 * 送る前にブラウザの中で行う処理（docs/spec.md §4 の 3）。画面の骨組みの段階では仮のもの。
 * - 写真の情報の読み取り（XMP/EXIF の位置・日時）は T01 `photo-meta` で置き換える。それまでは「位置なし・日付不明」
 * - 縮小・再エンコード（メタデータを消す）と元ファイルの SHA-256 はまだ無い。**元のファイルは決して送らない**（K6）ので、
 *   それまでは送る前に止める
 */
import type { TakenAtSource } from "@/types";
import type { LatLng } from "@/services/candidates";

export interface PhotoInfo {
  /** 撮影位置。端末の外に出さない（K6）。取れなければ null */
  position: LatLng | null;
  /** 'YYYY-MM-DD'（日本時間）。不明は null */
  takenAt: string | null;
  takenAtSource: TakenAtSource;
}

export interface PreparedPhoto {
  /** 縮小・再エンコード済みの JPEG（メタデータなし） */
  image: Blob;
  /** 元ファイルの SHA-256（小文字の16進64桁） */
  contentHash: string;
}

/** 縮小とハッシュがまだ無いことを表す。画面は「準備中」と出して送らない */
export class PreparePhotoUnavailableError extends Error {
  constructor() {
    super("写真の縮小がまだ用意されていない");
    this.name = "PreparePhotoUnavailableError";
  }
}

/** 写真の情報を読む（仮: T01 までは位置なし・日付不明） */
export async function readPhotoInfo(file: File): Promise<PhotoInfo> {
  void file;
  return { position: null, takenAt: null, takenAtSource: "none" };
}

/** 送る形にする（仮: 縮小が用意されるまでは必ず止める。元のファイルを送らないため） */
export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  void file;
  throw new PreparePhotoUnavailableError();
}
