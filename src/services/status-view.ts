/**
 * 判断（収穫可能／収穫済）と地図のピンの表示（docs/spec.md §7 の `/`・`/fields/[id]`、L1）。純粋関数。
 * 判断するのは委員。ここは記録を言葉にするだけで、収穫できるかを推測しない（AGENTS.md §4）。
 */
import type { FieldSummary, StatusEvent } from "@/types";
import type { StatusInputReason } from "@/services/status-reason";
import type { PostStatusOutcome, RevokeOutcome } from "@/repositories/interfaces/i-field-status-repository";

/** 地図のピンの状態 */
export interface PinState {
  status: "none" | "ready" | "done";
  /** 未確定の写真の候補か委員の選んだ番号に、この圃場がある */
  unconfirmed: boolean;
}

/** 「収穫可能」「収穫済」 */
export function statusLabel(status: StatusEvent["status"]): string {
  void status;
  throw new Error("not implemented");
}

/** 理由のコードを言葉に（選択肢の言葉、「・」でつなぐ）。0 個は「理由の記録なし」。知らないコードはそのまま出す */
export function reasonsLabel(codes: readonly string[]): string {
  void codes;
  throw new Error("not implemented");
}

/** 送る前の確かめ（parseStatusInput）で見つかった誤りの言葉 */
export function inputErrorLabel(reason: StatusInputReason): string {
  void reason;
  throw new Error("not implemented");
}

/** 判断を送った結果の言葉 */
export function postOutcomeLabel(outcome: PostStatusOutcome): string {
  void outcome;
  throw new Error("not implemented");
}

/** 取り消した結果の言葉 */
export function revokeOutcomeLabel(outcome: RevokeOutcome): string {
  void outcome;
  throw new Error("not implemented");
}

/**
 * 根拠の写真を押したときの選び方。選んでいれば外し、選んでいなければ末尾に足す。
 * 上限に達していたら足さずに limited: true。元の配列は変えない
 */
export function toggleRefPhoto(
  selected: readonly string[],
  photoId: string,
  max: number,
): { selected: string[]; limited: boolean } {
  void selected;
  void photoId;
  void max;
  throw new Error("not implemented");
}

/** 履歴に判断を入れる（同じ id は置き換え）。並びは at の新しい順、同じなら id の大きい順。元の配列は変えない */
export function withStatusEvent(history: readonly StatusEvent[], event: StatusEvent): StatusEvent[] {
  void history;
  void event;
  throw new Error("not implemented");
}

/** 地図のピンの状態。判断が無ければ none */
export function pinState(summary: FieldSummary): PinState {
  void summary;
  throw new Error("not implemented");
}
