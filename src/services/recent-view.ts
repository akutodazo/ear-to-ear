/**
 * 新着（/recent）の見せ方（docs/spec.md §7）。純粋関数。
 * 未確定と確定は文字だけでなく印で見分ける（麦色の印は未確定だけ。配色の決まり 11-03）。委員が選んだ番号は出さない。
 */
import type { UploadedPhoto } from "@/types";

export interface AssignmentBadge {
  /** pending: 未確定（麦色の印）、done: 確定、alert: 確定なのに番号が無い（矛盾） */
  tone: "pending" | "done" | "alert";
  badge: string;
  text: string;
}

type BadgePhoto = Pick<UploadedPhoto, "state" | "fieldId" | "candidateFieldIds">;

/** 印と番号（例 未確定・推定 A-06／確定・A-03） */
export function assignmentBadge(photo: BadgePhoto): AssignmentBadge {
  void photo;
  throw new Error("not implemented");
}

/** 「未確定だけ見る」が on なら未確定だけ（並びはそのまま） */
export function filterRecent(photos: UploadedPhoto[], onlyUnconfirmed: boolean): UploadedPhoto[] {
  void photos;
  void onlyUnconfirmed;
  throw new Error("not implemented");
}

/** 未確定の枚数（例 未確定 3枚） */
export function unconfirmedCountLabel(photos: Pick<UploadedPhoto, "state">[]): string {
  void photos;
  throw new Error("not implemented");
}
