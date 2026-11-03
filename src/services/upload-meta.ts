/**
 * POST /api/uploads の meta の検証（docs/spec.md §6）。
 * 距離・座標の項目は許可リストで拒否する（K6）。例外は出さず、理由のコードを返す。
 */
import type { UploadMeta } from "@/types";

/** meta の文字列の上限。正常な meta は 200 文字ほど */
export const UPLOAD_META_MAX_CHARS = 1024;

export type UploadMetaReason =
  | "too_long"
  | "not_json"
  | "not_object"
  | "unknown_key"
  | "missing_key"
  | "bad_content_hash"
  | "bad_taken_at"
  | "bad_taken_at_source"
  | "taken_at_mismatch"
  | "bad_candidates"
  | "too_many_candidates"
  | "duplicate_candidate"
  | "unknown_field"
  | "bad_chosen_field";

export type UploadMetaResult =
  | { ok: true; meta: UploadMeta }
  | { ok: false; reason: UploadMetaReason };

export function parseUploadMeta(
  _text: string,
  _knownFieldIds: ReadonlySet<string>,
): UploadMetaResult {
  throw new Error("not implemented");
}
