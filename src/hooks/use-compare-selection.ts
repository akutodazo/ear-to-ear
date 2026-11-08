/**
 * /fields/[id] の「比較」の選び方の Presenter。比べ方・日付・相手・前の日を「希望」として持ち、
 * 実際に出せる形には Service（photo-compare）が直す。
 * 詳細と比較を切り替えても選んだものが残るように、page の直下で呼ぶ（比較の段を閉じても消さない）。
 */
"use client";

import { useCallback, useMemo, useState } from "react";
import type { UploadedPhoto } from "@/types";
import { daysOf, indexByDay, resolveSameDay, resolveSameField, type CompareMode } from "@/services/photo-compare";

interface Wanted {
  date?: string;
  partner?: string;
  earlier?: string;
}

export function useCompareSelection(
  byField: Record<string, UploadedPhoto[]>,
  selfId: string,
  benchmarkId: string | null,
  districtIds: readonly string[],
) {
  const [mode, setMode] = useState<CompareMode>("same-day");
  const [wanted, setWanted] = useState<Wanted>({});
  const days = useMemo(() => indexByDay(byField), [byField]);
  const ownDays = useMemo(() => daysOf(days, selfId), [days, selfId]);
  const sameDay = useMemo(() => resolveSameDay(days, selfId, wanted, benchmarkId, districtIds), [days, selfId, wanted, benchmarkId, districtIds]);
  const sameField = useMemo(() => resolveSameField(days, selfId, wanted), [days, selfId, wanted]);
  const setDate = useCallback((date: string) => setWanted((w) => ({ ...w, date })), []);
  const setPartner = useCallback((partner: string) => setWanted((w) => ({ ...w, partner })), []);
  const setEarlier = useCallback((earlier: string) => setWanted((w) => ({ ...w, earlier })), []);

  return { mode, setMode, days, ownDays, sameDay, sameField, setDate, setPartner, setEarlier };
}
