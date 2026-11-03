/**
 * 写真の一覧の読み出し（GET /api/photos/recent、docs/spec.md §6）。行 → 画面の形（UploadedPhoto）。
 * 返す列は PHOTO_LIST_COLUMNS だけ。写真のハッシュ・R2 のキーは返さない（docs/privacy.md）。
 */
import { RECENT_LIMIT_DEFAULT, RECENT_LIMIT_MAX } from "../config";
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

/** ?limit= の値。/^[1-9]\d*$/ でなければ fallback、max を超えれば max。例外は出さない */
export function parseRecentLimit(
  raw: string | null,
  fallback: number = RECENT_LIMIT_DEFAULT,
  max: number = RECENT_LIMIT_MAX,
): number {
  void raw;
  void fallback;
  void max;
  throw new Error("not implemented");
}

/** 1 行を UploadedPhoto に写す。candidate_field_ids が文字列の配列の JSON でなければ例外（500） */
export function photoFromRow(row: PhotoListRow): UploadedPhoto {
  void row;
  throw new Error("not implemented");
}
