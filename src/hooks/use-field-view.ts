/**
 * 畑の画面の「詳細」と「比較」（#195）。#compare で切り替える。
 * Next の Link は pushState で動き hashchange が出ないので、同じ画面の中は自分で pushState して知らせる。戻る・進むは popstate で合わせる
 */
"use client";

import { useCallback, useSyncExternalStore } from "react";
import { readFieldView, type FieldView } from "@/services/detail-view";

const EVENT = "field-view-change";

function subscribe(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  window.addEventListener("popstate", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("hashchange", onChange);
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

export function useFieldView(): [FieldView, (next: FieldView) => void] {
  const view = useSyncExternalStore(subscribe, () => readFieldView(window.location.hash), () => "detail" as FieldView);
  const setView = useCallback((next: FieldView) => {
    if (readFieldView(window.location.hash) === next) return;
    const url = `${window.location.pathname}${window.location.search}${next === "compare" ? "#compare" : ""}`;
    window.history.pushState(window.history.state, "", url);
    window.dispatchEvent(new Event(EVENT));
    window.scrollTo({ top: 0 });
  }, []);
  return [view, setView];
}
