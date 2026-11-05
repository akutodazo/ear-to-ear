/**
 * URL の # が name と同じか。地図の板の「昨年の引き継ぎ あり」（/fields/A-03#last-season）から来たかを知るため（精査 4 回目 #2）。
 * 書き出しのときは false
 */
"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

export function useHashIs(name: string): boolean {
  return useSyncExternalStore(subscribe, () => window.location.hash === `#${name}`, () => false);
}
