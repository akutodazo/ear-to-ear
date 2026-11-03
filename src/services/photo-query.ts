/**
 * 写真の一覧の読み出し（GET /api/photos/recent、docs/spec.md §6）。行 → 画面の形（UploadedPhoto）。
 * 返す列は PHOTO_LIST_COLUMNS だけ。写真のハッシュ・R2 のキーは返さない（docs/privacy.md）。
 */
import { RECENT_LIMIT_DEFAULT, RECENT_LIMIT_MAX } from "@/config";
import type { UploadedPhoto } from "@/types";

/** SELECT する列の並び（photoFromRow のキーの順と同じ）。content_hash・r2_key・bytes・updated_at は入れない */
export const PHOTO_LIST_COLUMNS = [
  "id",
  "field_id",
  "chosen_field_id",
  "state",
  "candidate_field_ids",
  "taken_at",
  "taken_at_source",
  "width",
  "height",
  "uploaded_at",
  "uploader_device",
] as const;

/** D1 から読んだ 1 行 */
export interface PhotoListRow {
  id: string;
  field_id: string | null;
  chosen_field_id: string | null;
  state: UploadedPhoto["state"];
  /** JSON の文字列の配列 */
  candidate_field_ids: string;
  taken_at: string | null;
  taken_at_source: UploadedPhoto["takenAtSource"];
  width: number;
  height: number;
  uploaded_at: string;
  uploader_device: string;
}

/** 正の整数の 10 進（先頭の 0・符号・空白・ほかの数字の書き方は認めない） */
const LIMIT_PATTERN = /^[1-9]\d*$/;

/** ?limit= の値。/^[1-9]\d*$/ でなければ fallback、max を超えれば max。例外は出さない */
export function parseRecentLimit(
  raw: string | null,
  fallback: number = RECENT_LIMIT_DEFAULT,
  max: number = RECENT_LIMIT_MAX,
): number {
  if (raw === null || !LIMIT_PATTERN.test(raw)) return fallback;
  const n = Number(raw);
  return n > max ? max : n;
}

/** candidate_field_ids の JSON を文字列の配列に戻す。違えば例外（中身はメッセージに入れない） */
function parseCandidates(text: string): string[] {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("candidate_field_ids が JSON ではない");
  }
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new Error("candidate_field_ids が文字列の配列ではない");
  }
  return value;
}

/** 1 行を UploadedPhoto に写す。candidate_field_ids が文字列の配列の JSON でなければ例外（500） */
export function photoFromRow(row: PhotoListRow): UploadedPhoto {
  return {
    id: row.id,
    fieldId: row.field_id,
    chosenFieldId: row.chosen_field_id,
    state: row.state,
    candidateFieldIds: parseCandidates(row.candidate_field_ids),
    takenAt: row.taken_at,
    takenAtSource: row.taken_at_source,
    width: row.width,
    height: row.height,
    uploadedAt: row.uploaded_at,
    uploaderDevice: row.uploader_device,
  };
}

/**
 * ?fieldId= の値（GET /api/photos、T22）。圃場の一覧にある番号ならそのまま、それ以外（null・空・一覧に無い）は null。
 * 大文字小文字・前後の空白は直さない。例外は出さない
 */
export function parseFieldIdQuery(raw: string | null, knownFieldIds: ReadonlySet<string>): string | null {
  void raw;
  void knownFieldIds;
  throw new Error("not implemented");
}
