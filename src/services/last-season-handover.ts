/**
 * 来年の引き継ぎ（5 段目、11-05）。昨年の引き継ぎメモを、昨年の判断の日の前後だけ出す。純粋関数。
 * 出すかどうかは記録の日付（昨年の収穫可能の日、無ければ収穫済の日）と今日の月日だけで決め、収穫の時期を予想しない。
 * 日数の差は言わない（「あと n 日」と読めるため）。昨年の根拠の印は今年の記録へのリンクにしない（昨年の履歴・写真はこの画面に無い）
 */
import type { HandoverNote } from "@/types";
import { handoverSentences } from "./handover-view";
import type { SeasonRecord } from "./last-season";

export interface LastSeasonMemoSentence {
  text: string;
  /** 出所の言葉（例「2025/7/20 の判断」「2025/7/18 の写真」）。今年の札と区別するため年を入れ、リンクにしない（精査 4 回目 #3） */
  labels: string[];
  uncited: boolean;
}

export interface LastSeasonMemoView {
  season: string;
  sentences: LastSeasonMemoSentence[];
  /** 地図の板に出す 1 文目。文が無ければ null */
  first: string | null;
}

const WHEAT = "小麦";
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 24 * 60 * 60 * 1000;

/** 'YYYY-MM-DD' を UTC の 0 時の時刻に。ありえない日付（2/30 など）は null */
function dateMs(date: string): number | null {
  const m = DATE.exec(date);
  if (m === null) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const ms = Date.UTC(y, mo - 1, d);
  const back = new Date(ms);
  return back.getUTCFullYear() === y && back.getUTCMonth() === mo - 1 && back.getUTCDate() === d ? ms : null;
}

/** その圃場の、今年の 1 つ前の年のメモ。無ければ null */
export function lastSeasonNoteFor(notes: readonly HandoverNote[], fieldId: string, season: string): HandoverNote | null {
  const year = Number(season);
  if (!Number.isInteger(year)) return null;
  const last = String(year - 1);
  return notes.find((n) => n.fieldId === fieldId && n.season === last) ?? null;
}

/**
 * 今日が、昨年の判断の日（収穫可能、無ければ収穫済）の月日の前後 days 日の中か（端を含む）。
 * 記録が無い・判断の日が無い・小麦でない年・今日が日付の形でないときは false
 */
export function isNearLastSeason(record: SeasonRecord | null, today: string, days: number): boolean {
  if (record === null || record.crop !== WHEAT) return false;
  const anchor = record.readyAt ?? record.doneAt;
  if (anchor === null) return false;
  const todayMs = dateMs(today);
  const a = DATE.exec(anchor);
  if (todayMs === null || a === null) return false;
  const anchorThisYear = dateMs(`${today.slice(0, 4)}-${a[2]}-${a[3]}`);
  if (anchorThisYear === null) return false;
  return Math.abs(todayMs - anchorThisYear) <= days * DAY_MS;
}

/** デモで今日を差し替える `?today=YYYY-MM-DD`。正しい日付だけ返し、ほかは null */
export function demoToday(search: string): string | null {
  const value = new URLSearchParams(search).get("today");
  if (value === null || dateMs(value) === null) return null;
  return value;
}

const RECORD_DATE = /(\d{4})-(\d{2})-(\d{2})/;
const KIND_WORD = { status: "判断", photo: "写真" } as const;

/** 記録 1 件の出所の言葉。日付が読めなければ「昨年の判断」のように年だけ言う */
function originLabel(note: HandoverNote, kind: "status" | "photo", id: string): string {
  const record = note.records.find((r) => r.kind === kind && r.id === id);
  const m = record ? RECORD_DATE.exec(record.text) : null;
  return m ? `${m[1]}/${Number(m[2])}/${Number(m[3])} の${KIND_WORD[kind]}` : `${note.season}年の${KIND_WORD[kind]}`;
}

/** 今日を差し替えているときに画面に出す言葉（「7/20 として表示中（デモ）」。精査 4 回目 #5） */
export function demoTodayLabel(date: string): string {
  return `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))} として表示中（デモ）`;
}

/** 昨年のメモを画面の形にする（文と出所の言葉。リンクは持たない） */
export function lastSeasonMemoView(note: HandoverNote): LastSeasonMemoView {
  const sentences = handoverSentences(note).map((s) => ({ text: s.text, labels: s.sources.map((src) => originLabel(note, src.kind, src.id)), uncited: s.uncited }));
  return { season: note.season, sentences, first: sentences[0]?.text ?? null };
}
