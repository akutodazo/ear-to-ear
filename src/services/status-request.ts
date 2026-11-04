/**
 * POST /api/fields/:id/status の本文（L1、docs/spec.md §6、Issue #91）。純粋関数。
 * JSON を読み、中身の検証は T12 の parseStatusInput に任せる。HTTP の状態は 400（JSON でない）か 422（中身）。
 */
import { parseStatusInput, type StatusInput, type StatusInputReason } from "./status-reason";

/**
 * 本文の上限（バイト）。メモ 200 字（1 字 4 バイトまで）・理由 5 つ・根拠の写真 5 枚（UUID）が収まる大きさ
 */
export const STATUS_BODY_MAX_BYTES = 2048;

export type StatusBodyResult =
  | { ok: true; value: StatusInput }
  | { ok: false; status: 400 }
  | { ok: false; status: 422; reason: StatusInputReason };

/**
 * 本文の文字列を読む。JSON でなければ 400。読めたら parseStatusInput(…, confirmedPhotoIds) に通し、
 * 通らなければ 422 とその理由のコード。例外は出さない
 */
export function parseStatusBody(text: string, confirmedPhotoIds: ReadonlySet<string>): StatusBodyResult {
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return { ok: false, status: 400 };
  }
  const result = parseStatusInput(body, confirmedPhotoIds);
  if (!result.ok) return { ok: false, status: 422, reason: result.reason };
  return { ok: true, value: result.value };
}
