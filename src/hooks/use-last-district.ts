/**
 * 最後に見た地区（11-06 地図の精査 #2・#4）。地図と刈る順番で同じ値を使い、選んでいない畑の画面を開いたときに同じ地区から始める。
 * 端末の中にだけ残す（この端末での便利のため。読めない・書けないときは無いものとして扱う）
 */
"use client";

import { useCallback, useSyncExternalStore } from "react";

const KEY = "ear-to-ear:last-district";
/** 同じ画面の中で書いたことを知らせる（storage の知らせはほかの窓にしか届かない） */
const EVENT = "ear-to-ear:last-district";

function read(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** 知っている地区のときだけ返す（事前描画では null）。覚えるのは人が地区を選んだときだけ */
export function useLastDistrict(known: readonly string[]): { last: string | null; remember: (district: string) => void } {
  const raw = useSyncExternalStore(subscribe, read, () => null);
  const last = raw !== null && known.includes(raw) ? raw : null;
  const remember = useCallback((district: string) => {
    try {
      window.localStorage.setItem(KEY, district);
    } catch {
      // 残せなくても画面はそのまま動く
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return { last, remember };
}
