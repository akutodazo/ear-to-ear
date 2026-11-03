/**
 * 画面に出す文言（docs/spec.md §7）。純粋関数。
 * 数字は控えめに（spec §7）。距離は画面に出すだけで、送らない・保存しない（K6）。
 */
import type { UploadedPhoto } from "@/types";
import type { UploadOutcome } from "@/repositories/interfaces/i-photo-repository";

/** 候補までの距離（例 約120m・約1.2km）。10m 単位に丸め、最小は約10m */
export function distanceLabel(meters: number): string {
  void meters;
  throw new Error("not implemented");
}

/** 候補の表示（例 A-03（約120m）） */
export function candidateLabel(fieldId: string, meters: number): string {
  void fieldId;
  void meters;
  throw new Error("not implemented");
}

/** 撮影日の表示（例 2026年7月21日）。不明は「日付不明」（推測しない） */
export function takenAtLabel(takenAt: string | null): string {
  void takenAt;
  throw new Error("not implemented");
}

/** 新着の番号の表示（例 確定 A-03／未確定（推定 A-03）） */
export function assignmentLabel(
  photo: Pick<UploadedPhoto, "state" | "fieldId" | "chosenFieldId" | "candidateFieldIds">,
): string {
  void photo;
  throw new Error("not implemented");
}

/** 送った結果の表示 */
export function uploadOutcomeLabel(outcome: UploadOutcome): string {
  void outcome;
  throw new Error("not implemented");
}
