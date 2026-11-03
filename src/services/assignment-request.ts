/**
 * PATCH /api/photos/:id/assignment の本文の検証（docs/spec.md §6、Issue #78）。純粋関数。例外は出さず、理由のコードを返す。
 * 形の違う本文は 400、圃場の一覧に無い番号は 422、長すぎれば 413（対応は Worker の側）。
 */

/** 本文の上限（バイト）。{"fieldId":"A-01"} は 18 バイト */
export const ASSIGNMENT_BODY_MAX_BYTES = 256;

export type AssignmentBodyReason =
  | "too_long"
  | "not_json"
  | "not_object"
  | "unknown_key"
  | "missing_field_id"
  | "bad_field_id"
  | "unknown_field";

export type AssignmentBodyResult = { ok: true; fieldId: string } | { ok: false; reason: AssignmentBodyReason };

/** 本文 { fieldId: string } を検証する。番号は圃場の一覧（knownFieldIds）にあるものだけ */
export function parseAssignmentBody(text: string, knownFieldIds: ReadonlySet<string>): AssignmentBodyResult {
  void text;
  void knownFieldIds;
  throw new Error("not implemented");
}

/** 理由のコード → HTTP の状態 */
export function assignmentBodyStatus(reason: AssignmentBodyReason): 400 | 413 | 422 {
  void reason;
  throw new Error("not implemented");
}
