/**
 * L6 の引き継ぎメモの保存の形（docs/spec.md §5・§6、T29 #106）。行 → HandoverNote。
 * T29 の GET が読み、T30 の POST が書く（body の JSON は records と blocks だけ）。
 */
import type { HandoverNote, HandoverRecord } from "@/types";

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

/** 日本時間と UTC の差（ミリ秒） */
const JST_OFFSET_MS = 9 * 3600_000;

/** ミリ秒の時刻の、日本時間の年（'2026'） */
export function handoverSeason(nowMs: number): string {
  return String(new Date(nowMs + JST_OFFSET_MS).getUTCFullYear());
}

type HandoverBlock = HandoverNote["blocks"][number];
type HandoverCite = HandoverBlock["cites"][number];

/** 壊れた行の例外（中身はメッセージに入れない） */
function broken(what: string): Error {
  return new Error(`handover_notes の ${what} が壊れている`);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toRecord(value: unknown): HandoverRecord {
  if (!isObject(value)) throw broken("record");
  const { kind, id, text } = value;
  if (kind !== "status" && kind !== "photo") throw broken("record の kind");
  if (typeof id !== "string") throw broken("record の id");
  if (typeof text !== "string") throw broken("record の text");
  return { kind, id, text };
}

function toCite(value: unknown, recordCount: number): HandoverCite {
  if (!isObject(value)) throw broken("cite");
  const { start, end, citedText } = value;
  if (typeof start !== "number" || !Number.isInteger(start)) throw broken("cite の start");
  if (typeof end !== "number" || !Number.isInteger(end)) throw broken("cite の end");
  if (start < 0 || start >= end || end > recordCount) throw broken("cite の範囲");
  if (typeof citedText !== "string") throw broken("cite の citedText");
  return { start, end, citedText };
}

function toBlock(value: unknown, recordCount: number): HandoverBlock {
  if (!isObject(value)) throw broken("block");
  const { text, cites } = value;
  if (typeof text !== "string") throw broken("block の text");
  if (!Array.isArray(cites)) throw broken("block の cites");
  return { text, cites: cites.map((cite: unknown) => toCite(cite, recordCount)) };
}

/**
 * 行を HandoverNote に戻す。body の records・blocks の形が違う、引用の番号が records の範囲の外、
 * 列の型が違うなら例外（メッセージに中身を入れない）
 */
export function handoverNoteFromRow(row: HandoverNoteRow): HandoverNote {
  for (const column of HANDOVER_NOTE_COLUMNS) {
    if (typeof row[column] !== "string") throw broken(column);
  }
  let body: unknown;
  try {
    body = JSON.parse(row.body);
  } catch {
    throw broken("body");
  }
  if (!isObject(body)) throw broken("body");
  const { records, blocks } = body;
  if (!Array.isArray(records)) throw broken("records");
  if (!Array.isArray(blocks)) throw broken("blocks");
  const parsedRecords = records.map((record: unknown) => toRecord(record));
  return {
    fieldId: row.field_id,
    season: row.season,
    records: parsedRecords,
    blocks: blocks.map((block: unknown) => toBlock(block, parsedRecords.length)),
    model: row.model,
    createdAt: row.created_at,
  };
}
