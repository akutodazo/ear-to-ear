/**
 * 地図の凡例を開いているか（#200）。最初の 1 回だけ開いておき、閉じたら端末に覚える（localStorage。読めなければ毎回開く）。
 * 事前描画では閉じたまま（端末の値は描画の後に読む）
 */
"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { legendOpenAtStart } from "@/services/map-view";

const KEY = "ear-to-ear:legend-seen";

function readSeen(): boolean {
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

const noSubscribe = () => () => {};

export function useLegendOpen(): [boolean, (open: boolean) => void] {
  const seen = useSyncExternalStore(noSubscribe, readSeen, () => true);
  const [chosen, setChosen] = useState<boolean | null>(null);
  const set = useCallback((next: boolean) => {
    setChosen(next);
    if (!next) {
      try {
        window.localStorage.setItem(KEY, "1");
      } catch {
        /* 覚えられなくても閉じる */
      }
    }
  }, []);
  return [chosen ?? legendOpenAtStart(seen), set];
}
