/**
 * 判断（収穫可能／収穫済）と理由・根拠の入力の検証（docs/spec.md §3 の L1・§6 の `POST /api/fields/:id/status`・§9 の status-reason、T12）。純粋関数。
 * 例外は出さず、理由のコードを返す（HTTP の状態への対応は Worker の側）。
 * 決まり（11-03 本人決定）: 理由は選択肢のコードだけ・0 個でもよい・重ねない。メモは任意で 200 字まで（「その他」でも任意）。
 * 根拠の写真は 5 枚まで・重ねない・その圃場に確定済みの写真だけ。
 */
import type { StatusEvent } from "@/types";
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

/**
 * 本文（JSON を読んだ後の値）を検証する。
 * confirmedPhotoIds は、その圃場に確定済みの写真の id（呼ぶ側が D1 から集める）。
 */
export function parseStatusInput(body: unknown, confirmedPhotoIds: ReadonlySet<string>): StatusInputResult {
  void body;
  void confirmedPhotoIds;
  throw new Error("not implemented");
}
