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

export function readPhotoMeta(bytes: Uint8Array): PhotoMeta {
  void bytes;
  throw new Error("not implemented");
}
