/**
 * 押した手応えのための「更新中」（みっきぃ 2、#215）。読み込みが一瞬で終わっても、押してから最短の時間は busy を返す。
 * 決まりは services/busy-indicator。ここは押した時刻と、最短の時間が過ぎたときの描き直しだけ
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { busyEndsAt, busyVisible } from "@/services/busy-indicator";

export function useMinBusy(loading: boolean) {
  const [pressedAtMs, setPressedAtMs] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(0);

  const press = useCallback(() => {
    const now = Date.now();
    setPressedAtMs(now);
    setNowMs(now);
  }, []);

  // 最短の時間が過ぎたら 1 回描き直す
  useEffect(() => {
    const ends = busyEndsAt(pressedAtMs);
    if (ends === null) return;
    const timer = window.setTimeout(() => setNowMs(Date.now()), Math.max(0, ends - Date.now()));
    return () => window.clearTimeout(timer);
  }, [pressedAtMs]);

  return { busy: busyVisible({ nowMs, pressedAtMs, loading }), press };
}
