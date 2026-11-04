/**
 * 判断（収穫可能／収穫済）と地図のピンの表示（docs/spec.md §7 の `/`・`/fields/[id]`、L1）。純粋関数。
 * 判断するのは委員。ここは記録を言葉にするだけで、収穫できるかを推測しない（AGENTS.md §4）。
 */
import type { FieldSummary, StatusEvent } from "@/types";
import { STATUS_NOTE_MAX_CHARS, STATUS_REASONS, STATUS_REF_PHOTOS_MAX } from "@/config";
import type { StatusInputReason } from "@/services/status-reason";
import type { PostStatusOutcome, RevokeOutcome } from "@/repositories/interfaces/i-field-status-repository";

/** 地図のピンの状態 */
export interface PinState {
  status: "none" | "ready" | "done";
  /** 未確定の写真の候補か委員の選んだ番号に、この圃場がある */
  unconfirmed: boolean;
}

const STATUS_LABELS: Record<StatusEvent["status"], string> = {
  ready: "収穫可能",
  done: "収穫済",
};

/** 「収穫可能」「収穫済」 */
export function statusLabel(status: StatusEvent["status"]): string {
  return STATUS_LABELS[status];
}

/** 理由のコードを言葉に（選択肢の言葉、「・」でつなぐ）。0 個は「理由の記録なし」。知らないコードはそのまま出す */
export function reasonsLabel(codes: readonly string[]): string {
  if (codes.length === 0) return "理由の記録なし";
  return codes.map((code) => STATUS_REASONS.find((r) => r.code === code)?.label ?? code).join("・");
}

/** 画面が組み立てた入力なので、形の誤り（not_object など）は人が直せない。まとめて「もう一度」にする */
const BROKEN_INPUT = "入力を読み取れませんでした。画面を開き直してもう一度";

const INPUT_ERROR_LABELS: Record<StatusInputReason, string> = {
  not_object: BROKEN_INPUT,
  unknown_key: BROKEN_INPUT,
  bad_status: "「収穫可能」か「収穫済」を選んでください",
  bad_reasons: BROKEN_INPUT,
  unknown_reason: BROKEN_INPUT,
  duplicate_reason: BROKEN_INPUT,
  bad_note: BROKEN_INPUT,
  note_too_long: `メモは${STATUS_NOTE_MAX_CHARS}字までです`,
  bad_ref_photos: BROKEN_INPUT,
  too_many_ref_photos: `根拠の写真は${STATUS_REF_PHOTOS_MAX}枚までです`,
  duplicate_ref_photo: BROKEN_INPUT,
  ref_photo_not_in_field: "根拠には、この圃場に確定した写真だけを選べます",
};

/** 送る前の確かめ（parseStatusInput）で見つかった誤りの言葉 */
export function inputErrorLabel(reason: StatusInputReason): string {
  return INPUT_ERROR_LABELS[reason];
}

const NETWORK_ERROR = "つながりませんでした。電波のよい所でもう一度";

const POST_LABELS: Record<PostStatusOutcome["kind"], string> = {
  created: "記録しました",
  unauthorized: "記録するには合言葉が要ります",
  rejected: "記録できませんでした。選んだ内容を確かめてください",
  "network-error": NETWORK_ERROR,
  error: "記録できませんでした。時間をおいてもう一度",
};

/** 判断を送った結果の言葉 */
export function postOutcomeLabel(outcome: PostStatusOutcome): string {
  return POST_LABELS[outcome.kind];
}

const REVOKE_LABELS: Record<RevokeOutcome["kind"], string> = {
  ok: "取り消しました",
  unauthorized: "取り消すには合言葉が要ります",
  "not-found": "もう取り消されています",
  "network-error": NETWORK_ERROR,
  error: "取り消せませんでした。時間をおいてもう一度",
};

/** 取り消した結果の言葉 */
export function revokeOutcomeLabel(outcome: RevokeOutcome): string {
  return REVOKE_LABELS[outcome.kind];
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
  if (selected.includes(photoId)) return { selected: selected.filter((id) => id !== photoId), limited: false };
  if (selected.length >= max) return { selected: [...selected], limited: true };
  return { selected: [...selected, photoId], limited: false };
}

/** 新しい順（at の降順、同じなら id の降順） */
function newestFirst(a: StatusEvent, b: StatusEvent): number {
  if (a.at !== b.at) return a.at > b.at ? -1 : 1;
  return b.id - a.id;
}

/** 履歴に判断を入れる（同じ id は置き換え）。並びは at の新しい順、同じなら id の大きい順。元の配列は変えない */
export function withStatusEvent(history: readonly StatusEvent[], event: StatusEvent): StatusEvent[] {
  return [...history.filter((e) => e.id !== event.id), event].sort(newestFirst);
}

/** 地図のピンの状態。判断が無ければ none */
export function pinState(summary: FieldSummary): PinState {
  return { status: summary.latest?.status ?? "none", unconfirmed: summary.hasUnconfirmed };
}
