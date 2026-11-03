/**
 * POST /api/uploads の検査と、保存する行の組み立て（docs/spec.md §4・§5・§6）。例外は出さず、理由のコードを返す。
 * Worker は見出しをたどるだけで、画像のデコード・縮小・全体のハッシュはしない（CPU 10ms）。
 */
import { MAX_UPLOAD_BYTES } from "../config";
import type { UploadMeta } from "@/types";
import { scanJpegMarkers, type JpegInfo } from "./jpeg-segments";

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
  if (header === null) return false;
  const mediaType = header.split(";")[0].trim().toLowerCase();
  return mediaType === "multipart/form-data";
}

/** 欄はちょうど 2 つ: image（バイト列）と meta（文字列）が 1 つずつ。それ以外は bad_form */
export function checkUploadParts(parts: readonly FormPart[]): UploadPartsResult {
  const badForm: UploadPartsResult = { ok: false, reason: "bad_form" };
  if (parts.length !== 2) return badForm;
  let image: Uint8Array | null = null;
  let meta: string | null = null;
  for (const part of parts) {
    if (part.name === "image" && image === null && typeof part.value !== "string") {
      image = part.value;
    } else if (part.name === "meta" && meta === null && typeof part.value === "string") {
      meta = part.value;
    } else {
      return badForm;
    }
  }
  if (image === null || meta === null) return badForm;
  return { ok: true, image, meta };
}

/**
 * 画像の検査。この順で最初の 1 つ: 大きすぎ → JPEG でない（inspect が投げる。種類は問わない）→ APP1〜15 →
 * 長辺が上限超 → 最初の EOI でちょうど終わらない（JPEG でない）。
 * APP1〜15 は最初のスキャンの後ろ（2 枚目のスキャンの前）も見る。わざと隠したメタデータも通さない（PR #64 のレビュー #1）
 */
export function checkUploadImage(
  bytes: Uint8Array,
  inspect: (bytes: Uint8Array) => JpegInfo,
  maxBytes: number,
  maxLongEdge: number,
): UploadImageResult {
  if (bytes.byteLength > maxBytes) return { ok: false, reason: "too_large" };
  let info: JpegInfo;
  try {
    info = inspect(bytes);
  } catch {
    return { ok: false, reason: "not_jpeg" };
  }
  const scan = scanJpegMarkers(bytes);
  if (info.appSegments.length > 0 || scan.appSegments.length > 0) return { ok: false, reason: "metadata" };
  if (Math.max(info.width, info.height) > maxLongEdge) return { ok: false, reason: "bad_dimensions" };
  if (!scan.endsAtEoi) return { ok: false, reason: "not_jpeg" };
  return { ok: true, width: info.width, height: info.height };
}

/** R2 のキー uploads/<id>.jpg */
export function r2KeyFor(id: string): string {
  return `uploads/${id}.jpg`;
}

/** 保存する 1 行。chosenFieldId があっても state は unconfirmed、field_id は null */
export function photoRow(input: PhotoRowInput): PhotoRow {
  const { id, meta, width, height, bytes, device, nowIso } = input;
  return {
    id,
    field_id: null,
    chosen_field_id: meta.chosenFieldId,
    state: "unconfirmed",
    candidate_field_ids: JSON.stringify(meta.candidateFieldIds),
    taken_at: meta.takenAt,
    taken_at_source: meta.takenAtSource,
    content_hash: meta.contentHash,
    r2_key: r2KeyFor(id),
    width,
    height,
    bytes,
    uploader_device: device,
    uploaded_at: nowIso,
    updated_at: nowIso,
  };
}

/** PHOTO_COLUMNS の並びの値 */
export function photoRowValues(row: PhotoRow): unknown[] {
  return PHOTO_COLUMNS.map((column) => row[column]);
}
