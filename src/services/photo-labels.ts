/**
 * 画面に出す文言（docs/spec.md §7）。純粋関数。
 * 数字は控えめに（spec §7）。距離は画面に出すだけで、送らない・保存しない（K6）。
 */
import type { UploadedPhoto } from "@/types";
import type { UploadOutcome } from "@/repositories/interfaces/i-photo-repository";

/** 候補までの距離（例 約120m・約1.2km）。10m 単位に丸め、最小は約10m */
export function distanceLabel(meters: number): string {
  const rounded = Math.max(10, Math.round(meters / 10) * 10);
  if (rounded < 1000) return `約${rounded}m`;
  // km は元の距離から丸める（10m に丸めた値をもう一度丸めると、15049m が 15.1km になる）
  return `約${(meters / 1000).toFixed(1)}km`;
}

/** 候補の表示（例 A-03（約120m）） */
export function candidateLabel(fieldId: string, meters: number): string {
  return `${fieldId}（${distanceLabel(meters)}）`;
}

/** 候補の出し方。一番近い候補だけ距離つき（例 A-06（約50m））、ほかは番号だけ（例 A-07・A-02）。無ければ null */
export function candidateSummary(
  candidates: { fieldId: string; meters: number }[],
): { primary: string; others: string | null } | null {
  void candidates;
  throw new Error("not implemented");
}

/** 送り終わった後のまとめ（例 3枚送りました。1枚は送れませんでした）。どちらも 0 なら null */
export function sendSummaryLabel(counts: { sent: number; failed: number }): string | null {
  void counts;
  throw new Error("not implemented");
}

/** 撮影日の表示（例 2026年7月21日）。不明は「日付不明」（推測しない） */
export function takenAtLabel(takenAt: string | null): string {
  if (takenAt === null) return "日付不明";
  const [year, month, day] = takenAt.split("-").map(Number);
  return `${year}年${month}月${day}日`;
}

/** 新着の番号の表示（例 確定 A-03／未確定（推定 A-03）） */
export function assignmentLabel(
  photo: Pick<UploadedPhoto, "state" | "fieldId" | "chosenFieldId" | "candidateFieldIds">,
): string {
  if (photo.state === "confirmed") {
    // 確定なのに番号が無いのはデータの矛盾。隠さずに目立たせる
    return photo.fieldId === null ? "確定（番号なし）" : `確定 ${photo.fieldId}`;
  }
  // 委員が選んだ番号（chosenFieldId）の出し方は決めていないので出さない（spec §7）
  const nearest = photo.candidateFieldIds[0];
  return nearest === undefined ? "未確定" : `未確定（推定 ${nearest}）`;
}

const OUTCOME_LABELS: Record<UploadOutcome["kind"], string> = {
  created: "送りました",
  duplicate: "同じ写真はもう送られています",
  unauthorized: "合言葉を入れ直してください",
  "too-large": "写真が大きすぎて送れませんでした",
  rejected: "この写真は送れませんでした",
  "network-error": "つながりませんでした。電波のよい所でもう一度送ってください",
  error: "送れませんでした。時間をおいてもう一度送ってください",
};

/** 送った結果の表示 */
export function uploadOutcomeLabel(outcome: UploadOutcome): string {
  return OUTCOME_LABELS[outcome.kind];
}
