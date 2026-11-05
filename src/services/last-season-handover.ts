/**
 * 来年の引き継ぎ（5 段目、11-05）。昨年の引き継ぎメモを、昨年の判断の日の前後だけ出す。純粋関数。
 * まだ実装していない（RED）
 */
import type { HandoverNote } from "@/types";
import type { SeasonRecord } from "./last-season";

export interface LastSeasonMemoSentence {
  text: string;
  labels: string[];
  uncited: boolean;
}

export interface LastSeasonMemoView {
  season: string;
  sentences: LastSeasonMemoSentence[];
  first: string | null;
}

export function lastSeasonNoteFor(_notes: readonly HandoverNote[], _fieldId: string, _season: string): HandoverNote | null {
  throw new Error("未実装");
}

export function isNearLastSeason(_record: SeasonRecord | null, _today: string, _days: number): boolean {
  throw new Error("未実装");
}

export function demoToday(_search: string): string | null {
  throw new Error("未実装");
}

export function lastSeasonMemoView(_note: HandoverNote): LastSeasonMemoView {
  throw new Error("未実装");
}
