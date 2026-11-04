/**
 * 判断（収穫可能／収穫済）と理由・根拠の入力の検証（docs/spec.md §3 の L1・§6 の `POST /api/fields/:id/status`・§9 の status-reason、T12）。純粋関数。
 * 例外は出さず、理由のコードを返す（HTTP の状態への対応は Worker の側）。
 * 決まり（11-03 本人決定）: 理由は選択肢のコードだけ・0 個でもよい・重ねない。メモは任意で 200 字まで（「その他」でも任意）。
 * 根拠の写真は 5 枚まで・重ねない・その圃場に確定済みの写真だけ。
 */
import type { StatusEvent } from "@/types";
import { STATUS_NOTE_MAX_CHARS, STATUS_REASONS, STATUS_REF_PHOTOS_MAX } from "../config";
import type { StatusReasonCode } from "../config";

export type StatusInputReason =
  | "not_object"
  | "unknown_key"
  | "bad_status"
  | "bad_reasons"
  | "unknown_reason"
  | "duplicate_reason"
  | "bad_note"
  | "note_too_long"
  | "bad_ref_photos"
  | "too_many_ref_photos"
  | "duplicate_ref_photo"
  | "ref_photo_not_in_field";

/** 検証を通った入力。note は前後の空白を除き、空なら null */
export interface StatusInput {
  status: StatusEvent["status"];
  reasons: StatusReasonCode[];
  note: string | null;
  refPhotoIds: string[];
}

export type StatusInputResult = { ok: true; value: StatusInput } | { ok: false; reason: StatusInputReason };

const ALLOWED_KEYS: readonly string[] = ["status", "reasons", "note", "refPhotoIds"];

function fail(reason: StatusInputReason): StatusInputResult {
  return { ok: false, reason };
}

function hasDuplicate(values: readonly string[]): boolean {
  return new Set(values).size !== values.length;
}

/**
 * 本文（JSON を読んだ後の値）を検証する。
 * confirmedPhotoIds は、その圃場に確定済みの写真の id（呼ぶ側が D1 から集める）。
 */
export function parseStatusInput(body: unknown, confirmedPhotoIds: ReadonlySet<string>): StatusInputResult {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return fail("not_object");
  const record = body as Record<string, unknown>;
  const keys = Object.keys(record);
  for (const key of keys) {
    if (!ALLOWED_KEYS.includes(key)) return fail("unknown_key");
  }

  const status = record.status;
  if (status !== "ready" && status !== "done") return fail("bad_status");

  const rawReasons = record.reasons;
  if (!Array.isArray(rawReasons)) return fail("bad_reasons");
  const reasons: string[] = [];
  for (const item of rawReasons) {
    if (typeof item !== "string") return fail("bad_reasons");
    reasons.push(item);
  }
  const codes: readonly string[] = STATUS_REASONS.map((r) => r.code);
  for (const code of reasons) {
    if (!codes.includes(code)) return fail("unknown_reason");
  }
  if (hasDuplicate(reasons)) return fail("duplicate_reason");

  const rawNote = record.note;
  let note: string | null = null;
  if (rawNote !== undefined && rawNote !== null) {
    if (typeof rawNote !== "string") return fail("bad_note");
    const trimmed = rawNote.trim();
    if (Array.from(trimmed).length > STATUS_NOTE_MAX_CHARS) return fail("note_too_long");
    note = trimmed === "" ? null : trimmed;
  }

  const rawRefs = record.refPhotoIds;
  if (!Array.isArray(rawRefs)) return fail("bad_ref_photos");
  const refPhotoIds: string[] = [];
  for (const item of rawRefs) {
    if (typeof item !== "string" || item === "") return fail("bad_ref_photos");
    refPhotoIds.push(item);
  }
  if (refPhotoIds.length > STATUS_REF_PHOTOS_MAX) return fail("too_many_ref_photos");
  if (hasDuplicate(refPhotoIds)) return fail("duplicate_ref_photo");
  for (const id of refPhotoIds) {
    if (!confirmedPhotoIds.has(id)) return fail("ref_photo_not_in_field");
  }

  return {
    ok: true,
    value: { status, reasons: reasons as StatusReasonCode[], note, refPhotoIds },
  };
}
