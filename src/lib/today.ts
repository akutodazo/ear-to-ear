/**
 * 今日（日本時間の 'YYYY-MM-DD'）。ブラウザ専用（URL と sessionStorage を読む）。
 * デモでは `?today=2026-07-20` で今日を差し替える（来年の引き継ぎ、5 段目。デモの記録は 7 月なので）。
 * 一度付けた差し替えは、そのタブの中だけ（sessionStorage）で画面を移っても続く。画面には「7/20 として表示中（デモ）×」と出し、× で外せる（精査 4 回目 #5）。
 * 値の形は Service（demoToday）が確かめる
 */
import { demoToday } from "@/services/last-season-handover";
import { isoToJstDate } from "@/services/last-season";

const KEY = "ear-to-ear:today";
const EVENT = "ear-to-ear:today";

/** 差し替えている今日。差し替えていなければ null */
export function readDemoToday(): string | null {
  const fromUrl = demoToday(window.location.search);
  try {
    if (fromUrl !== null) window.sessionStorage.setItem(KEY, fromUrl);
    const kept = window.sessionStorage.getItem(KEY);
    if (kept !== null && demoToday(`?today=${kept}`) !== null) return kept;
  } catch {
    // 保存できない端末では URL だけで決める
  }
  return fromUrl;
}

/** 今日。差し替えていればその日 */
export function readToday(): string {
  return readDemoToday() ?? isoToJstDate(new Date().toISOString());
}

/** 差し替えを外す（URL の ?today も消す）。読んでいる画面には知らせる */
export function clearDemoToday(): void {
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    // 保存できない端末では URL を消すだけ
  }
  const url = new URL(window.location.href);
  url.searchParams.delete("today");
  window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  window.dispatchEvent(new Event(EVENT));
}

/** 差し替えが変わったら呼ぶ（useSyncExternalStore の subscribe） */
export function subscribeToday(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
}
