/**
 * L6 の引き継ぎメモの保存の形（docs/spec.md §5・§6、T29 #106）。行 → HandoverNote。
 * T29 の GET が読み、T30 の POST が書く（body の JSON は records と blocks だけ）。
 */
import type { HandoverNote } from "@/types";

/** SELECT する列の並び */
export const HANDOVER_NOTE_COLUMNS = ["field_id", "season", "body", "model", "created_at"] as const;

/** D1 から読んだ 1 行 */
export interface HandoverNoteRow {
  field_id: string;
  season: string;
  /** JSON の { records, blocks } */
  body: string;
  model: string;
  created_at: string;
}

/** ミリ秒の時刻の、日本時間の年（'2026'） */
export function handoverSeason(_nowMs: number): string {
  throw new Error("未実装");
}

/**
 * 行を HandoverNote に戻す。body の records・blocks の形が違う、引用の番号が records の範囲の外、
 * 列の型が違うなら例外（メッセージに中身を入れない）
 */
export function handoverNoteFromRow(_row: HandoverNoteRow): HandoverNote {
  throw new Error("未実装");
}
