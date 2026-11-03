/**
 * POST /api/uploads の検査と、保存する行の組み立て（docs/spec.md §4・§5・§6）。例外は出さず、理由のコードを返す。
 * Worker は見出しをたどるだけで、画像のデコード・縮小・全体のハッシュはしない（CPU 10ms）。
 */
import { MAX_UPLOAD_BYTES } from "../config";
import type { UploadMeta } from "@/types";
import type { JpegInfo } from "./jpeg-segments";

/** 本文の上限。画像の上限に、multipart の境界・見出しと meta（1024 文字の多バイト分）のゆとりを足す */
export const UPLOAD_BODY_MAX_BYTES = MAX_UPLOAD_BYTES + 16 * 1024;

/** formData() の 1 つの欄。ファイルはバイト列、文字列はそのまま */
export interface FormPart {
  name: string;
  value: string | Uint8Array;
}

export type UploadPartsResult = { ok: true; image: Uint8Array; meta: string } | { ok: false; reason: "bad_form" };

export type UploadImageReason = "too_large" | "not_jpeg" | "metadata" | "bad_dimensions";

export type UploadImageResult = { ok: true; width: number; height: number } | { ok: false; reason: UploadImageReason };

/** uploaded_photos の 1 行（migrations/0001_init.sql の列と同じ名前・同じ数） */
export interface PhotoRow {
  id: string;
  field_id: null;
  chosen_field_id: string | null;
  state: "unconfirmed";
  candidate_field_ids: string;
  taken_at: string | null;
  taken_at_source: UploadMeta["takenAtSource"];
  content_hash: string;
  r2_key: string;
  width: number;
  height: number;
  bytes: number;
  uploader_device: string;
  uploaded_at: string;
  updated_at: string;
}

/** INSERT の列の並び。photoRowValues の並びと同じ */
export const PHOTO_COLUMNS: readonly (keyof PhotoRow)[] = [
  "id",
  "field_id",
  "chosen_field_id",
  "state",
  "candidate_field_ids",
  "taken_at",
  "taken_at_source",
  "content_hash",
  "r2_key",
  "width",
  "height",
  "bytes",
  "uploader_device",
  "uploaded_at",
  "updated_at",
];

export interface PhotoRowInput {
  id: string;
  meta: UploadMeta;
  width: number;
  height: number;
  bytes: number;
  device: string;
  /** ISO 8601（deps.nowMs から） */
  nowIso: string;
}

/** media type が multipart/form-data か（大文字小文字と ; 以降のパラメータは無視） */
export function isMultipartContentType(header: string | null): boolean {
  void header;
  throw new Error("not implemented");
}

/** 欄はちょうど 2 つ: image（バイト列）と meta（文字列）が 1 つずつ。それ以外は bad_form */
export function checkUploadParts(parts: readonly FormPart[]): UploadPartsResult {
  void parts;
  throw new Error("not implemented");
}

/**
 * 画像の検査。この順で最初の 1 つ: 大きすぎ → JPEG でない（inspect が投げる。種類は問わない）→ APP1〜15 →
 * 長辺が上限超 → 末尾が FF D9 でない（JPEG でない）
 */
export function checkUploadImage(
  bytes: Uint8Array,
  inspect: (bytes: Uint8Array) => JpegInfo,
  maxBytes: number,
  maxLongEdge: number,
): UploadImageResult {
  void bytes;
  void inspect;
  void maxBytes;
  void maxLongEdge;
  throw new Error("not implemented");
}

/** R2 のキー uploads/<id>.jpg */
export function r2KeyFor(id: string): string {
  void id;
  throw new Error("not implemented");
}

/** 保存する 1 行。chosenFieldId があっても state は unconfirmed、field_id は null */
export function photoRow(input: PhotoRowInput): PhotoRow {
  void input;
  throw new Error("not implemented");
}

/** PHOTO_COLUMNS の並びの値 */
export function photoRowValues(row: PhotoRow): unknown[] {
  void row;
  throw new Error("not implemented");
}
