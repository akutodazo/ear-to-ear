/**
 * 来年の引き継ぎ（5 段目、11-05）の Presenter。昨年の引き継ぎメモを、昨年の判断の日の前後（LAST_SEASON_HANDOVER_DAYS 日）だけ返す。
 * 昨年のメモはいまは手で書いた架空の例（src/data/handover-2025.json）。本番で昨年のメモを API から読むようになったら、ここだけ差し替える
 */
"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { HandoverNote } from "@/types";
import { LAST_SEASON_HANDOVER_DAYS } from "@/config";
import notesData from "@/data/handover-2025.json";
import seasonsData from "@/data/seasons.json";
import { lastSeasonFor, type SeasonRecord } from "@/services/last-season";
import { isNearLastSeason, lastSeasonMemoView, lastSeasonNoteFor, type LastSeasonMemoView } from "@/services/last-season-handover";
import { readToday } from "@/lib/today";

const notes = notesData as HandoverNote[];
const seasons: SeasonRecord[] = seasonsData;

const subscribe = () => () => {};

/** 今日（日本時間）。書き出しのときは null（ブラウザで読む） */
export function useToday(): string | null {
  return useSyncExternalStore(subscribe, readToday, () => null);
}

export function useLastSeasonMemo(fieldId: string | null, season: string): LastSeasonMemoView | null {
  const today = useToday();
  return useMemo(() => {
    if (fieldId === null || today === null) return null;
    if (!isNearLastSeason(lastSeasonFor(seasons, fieldId, season), today, LAST_SEASON_HANDOVER_DAYS)) return null;
    const note = lastSeasonNoteFor(notes, fieldId, season);
    return note === null ? null : lastSeasonMemoView(note);
  }, [fieldId, season, today]);
}
