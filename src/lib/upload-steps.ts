/**
 * 送る前にブラウザの中で行う処理（docs/spec.md §4 の 3）。
 * - 写真の情報の読み取り（XMP/EXIF の位置・日時）は T01 `photo-meta` で置き換える。それまでは「位置なし・日付不明」
 * - 縮小・再エンコード（メタデータを消す）と元ファイルの SHA-256。**元のファイルは決して送らない**（K6）。
 *   ブラウザが付ける APP2（色の情報）なども取り除き、inspectJpeg で APP1〜15 が無いことを確かめてから渡す
 */
import type { TakenAtSource } from "@/types";
import type { LatLng } from "@/services/candidates";
import { MAX_UPLOAD_BYTES } from "@/config";
import { inspectJpeg } from "@/services/jpeg-segments";
import { checkPreparedJpeg, stripAppSegments } from "@/services/prepared-photo";
import { JPEG_QUALITIES, resizeToJpeg } from "./resize-jpeg";
import { sha256Hex } from "./sha256";

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

/** 縮小した写真が送れる形にならなかった（メタデータが残る・大きすぎる・読めない）。画面は送らない */
export class PreparePhotoUnavailableError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "PreparePhotoUnavailableError";
  }
}

/** 写真の情報を読む（仮: T01 までは位置なし・日付不明） */
export async function readPhotoInfo(file: File): Promise<PhotoInfo> {
  void file;
  return { position: null, takenAt: null, takenAtSource: "none" };
}

/** 送る形にする: 元ファイルのハッシュ → 縮小・再エンコード → 最後の確かめ（メタデータなし・上限以下） */
export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  const contentHash = await sha256Hex(await file.arrayBuffer());
  let reason = "縮小できない";
  for (const quality of JPEG_QUALITIES) {
    const encoded = new Uint8Array(await (await resizeToJpeg(file, quality)).arrayBuffer());
    // ブラウザの再エンコードは APP2（色の情報）を付けるので取り除く。読めなければ送らない
    const stripped = stripAppSegments(encoded);
    const problem = stripped === null ? "JPEG として読めない" : checkPreparedJpeg(stripped, inspectJpeg, MAX_UPLOAD_BYTES);
    if (stripped !== null && problem === null) {
      return { image: new Blob([stripped as BlobPart], { type: "image/jpeg" }), contentHash };
    }
    reason = problem ?? "JPEG として読めない";
    // 大きすぎるときだけ画質を下げてやり直す。メタデータが残る・読めないはやり直しても同じ
    if (problem !== "縮小しても大きすぎる") break;
  }
  throw new PreparePhotoUnavailableError(reason);
}
