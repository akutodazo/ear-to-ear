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
  // JSON として読む前に長さを見る（Worker はバイトで数えて読む。文字数はバイト数以下）
  if (text.length > ASSIGNMENT_BODY_MAX_BYTES) return { ok: false, reason: "too_long" };
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return { ok: false, reason: "not_json" };
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) return { ok: false, reason: "not_object" };
  // in ではなく Object.keys で見る（"__proto__" も自分のキーとして数える）
  const keys = Object.keys(body);
  if (keys.some((key) => key !== "fieldId")) return { ok: false, reason: "unknown_key" };
  if (keys.length === 0) return { ok: false, reason: "missing_field_id" };
  const fieldId = (body as Record<string, unknown>).fieldId;
  if (typeof fieldId !== "string") return { ok: false, reason: "bad_field_id" };
  // 削らず・正規化せずに、一覧と完全に一致するものだけ
  if (!knownFieldIds.has(fieldId)) return { ok: false, reason: "unknown_field" };
  return { ok: true, fieldId };
}

/** 理由のコード → HTTP の状態 */
export function assignmentBodyStatus(reason: AssignmentBodyReason): 400 | 413 | 422 {
  if (reason === "too_long") return 413;
  if (reason === "bad_field_id" || reason === "unknown_field") return 422;
  return 400;
}
