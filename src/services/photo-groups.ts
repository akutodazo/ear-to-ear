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

/** 文字列の大小（降順に使う）。a が先なら負 */
function compareDesc(a: string, b: string): number {
  if (a > b) return -1;
  if (a < b) return 1;
  return 0;
}

/** 撮影日の新しい順、null は後ろ */
function compareTakenAt(a: string | null, b: string | null): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return compareDesc(a, b);
}

/** 送った時刻の新しい順、同じなら id の大きい順 */
function comparePhotos(a: UploadedPhoto, b: UploadedPhoto): number {
  const byTime = compareDesc(a.uploadedAt, b.uploadedAt);
  if (byTime !== 0) return byTime;
  return compareDesc(a.id, b.id);
}

/** fieldId に確定済みの写真を撮影日ごとにまとめる。元の配列と写真は変えない。該当が無ければ [] */
export function groupFieldPhotos(photos: UploadedPhoto[], fieldId: string): PhotoGroup[] {
  const selected = photos.filter((p) => p.state === "confirmed" && p.fieldId === fieldId);
  const sorted = [...selected].sort(comparePhotos);

  const byDay = new Map<string | null, UploadedPhoto[]>();
  for (const p of sorted) {
    const list = byDay.get(p.takenAt);
    if (list === undefined) {
      byDay.set(p.takenAt, [p]);
    } else {
      list.push(p);
    }
  }

  const days = [...byDay.keys()].sort(compareTakenAt);
  return days.map((takenAt) => ({ takenAt, photos: byDay.get(takenAt) ?? [] }));
}
