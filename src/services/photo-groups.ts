/**
 * 圃場ページの写真の並べ方（docs/spec.md §7 の `/fields/[id]`・§9 の photo-groups、T06）。純粋関数。
 * その圃場に**確定済み**の写真だけを、撮影日ごとにまとめる。撮影日の新しい日が先、日付不明はいちばん後ろの別枠。
 * 同じ日の中は送った時刻の新しい順、同じ時刻なら id の大きい順（いつも同じ並びにする）。未確定の写真は出さない。
 */
import type { UploadedPhoto } from "@/types";

/** 撮影日 1 つ分。takenAt が null の枠が「日付不明」 */
export interface PhotoGroup {
  /** 'YYYY-MM-DD'（日本時間）。日付不明は null */
  takenAt: string | null;
  /** 1 枚以上。送った時刻の新しい順 */
  photos: UploadedPhoto[];
}

/** fieldId に確定済みの写真を撮影日ごとにまとめる。元の配列と写真は変えない。該当が無ければ [] */
export function groupFieldPhotos(photos: UploadedPhoto[], fieldId: string): PhotoGroup[] {
  void photos;
  void fieldId;
  throw new Error("not implemented");
}
