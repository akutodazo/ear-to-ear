/**
 * 判断の履歴の読み出し（L1、docs/spec.md §6）。行 → 画面の形（StatusEvent）。
 * T23（取り消し）が使い、T24（地図の一覧）も使う予定。
 */
import type { StatusEvent } from "@/types";

/** SELECT・RETURNING する列の並び（statusEventFromRow のキーの順と同じ） */
export const STATUS_EVENT_COLUMNS = [
  "id",
  "field_id",
  "status",
  "reasons",
  "note",
  "ref_photo_ids",
  "actor_device",
  "at",
  "revoked_at",
] as const;

/** D1 から読んだ 1 行 */
export interface StatusEventRow {
  id: number;
  field_id: string;
  status: StatusEvent["status"];
  /** JSON の文字列の配列 */
  reasons: string;
  note: string | null;
  /** JSON の文字列の配列 */
  ref_photo_ids: string;
  actor_device: string;
  at: string;
  revoked_at: string | null;
}

/**
 * :id の値（DELETE /api/status-events/:id）。正の整数の 10 進（/^[1-9]\d*$/）で
 * Number.MAX_SAFE_INTEGER 以下なら数、それ以外は null。例外は出さない
 */
export function parseStatusEventId(raw: string): number | null {
  throw new Error("not implemented");
}

/**
 * 1 行を StatusEvent に写す。reasons・ref_photo_ids が文字列の配列の JSON でなければ例外（500）。
 * 例外のメッセージに列の中身を入れない
 */
export function statusEventFromRow(row: StatusEventRow): StatusEvent {
  throw new Error("not implemented");
}
