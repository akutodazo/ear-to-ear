/**
 * POST /api/uploads の meta の検証（docs/spec.md §6）。
 * 距離・座標の項目は許可リストで拒否する（K6）。例外は出さず、理由のコードを返す。
 */
import { MAX_CANDIDATES } from "../config";
import type { TakenAtSource, UploadMeta } from "@/types";

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

const REQUIRED_KEYS = ["contentHash", "takenAt", "takenAtSource", "candidateFieldIds"];
const ALLOWED_KEYS: ReadonlySet<string> = new Set([...REQUIRED_KEYS, "chosenFieldId"]);

const CONTENT_HASH_PATTERN = /^[0-9a-fA-F]{64}$/;
const TAKEN_AT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function fail(reason: UploadMetaReason): UploadMetaResult {
  return { ok: false, reason };
}

function parseJson(text: string): { value: unknown } | null {
  try {
    return { value: JSON.parse(text) };
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** null か実在する日付。new Date(文字列) は環境で揺れるので Date.UTC で往復させる */
function isTakenAt(value: unknown): value is string | null {
  if (value === null) return true;
  if (typeof value !== "string" || !TAKEN_AT_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10) === value;
}

function isTakenAtSource(value: unknown): value is TakenAtSource {
  return value === "xmp" || value === "exif" || value === "none";
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function parseUploadMeta(
  text: string,
  knownFieldIds: ReadonlySet<string>,
): UploadMetaResult {
  if (text.length > UPLOAD_META_MAX_CHARS) return fail("too_long");

  const parsed = parseJson(text);
  if (parsed === null) return fail("not_json");
  const body = parsed.value;
  if (!isRecord(body)) return fail("not_object");

  // in は "constructor" などで true になるので Object.keys で見る
  const keys = Object.keys(body);
  if (keys.some((key) => !ALLOWED_KEYS.has(key))) return fail("unknown_key");
  if (REQUIRED_KEYS.some((key) => !keys.includes(key))) return fail("missing_key");

  const { contentHash, takenAt, takenAtSource, candidateFieldIds } = body;
  if (typeof contentHash !== "string" || !CONTENT_HASH_PATTERN.test(contentHash)) {
    return fail("bad_content_hash");
  }
  if (!isTakenAt(takenAt)) return fail("bad_taken_at");
  if (!isTakenAtSource(takenAtSource)) return fail("bad_taken_at_source");
  if ((takenAtSource === "none") !== (takenAt === null)) return fail("taken_at_mismatch");

  if (!isStringArray(candidateFieldIds)) return fail("bad_candidates");
  if (candidateFieldIds.length > MAX_CANDIDATES) return fail("too_many_candidates");
  if (new Set(candidateFieldIds).size !== candidateFieldIds.length) {
    return fail("duplicate_candidate");
  }
  if (candidateFieldIds.some((id) => !knownFieldIds.has(id))) return fail("unknown_field");

  const chosen = body.chosenFieldId ?? null;
  const chosenFieldId = typeof chosen === "string" && knownFieldIds.has(chosen) ? chosen : null;
  if (chosen !== null && chosenFieldId === null) return fail("bad_chosen_field");

  return {
    ok: true,
    meta: {
      contentHash: contentHash.toLowerCase(),
      takenAt,
      takenAtSource,
      candidateFieldIds,
      chosenFieldId,
    },
  };
}
