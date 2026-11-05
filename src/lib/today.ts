/**
 * 今日（日本時間の 'YYYY-MM-DD'）。ブラウザ専用（URL と sessionStorage を読む）。
 * デモでは `?today=2026-07-20` で今日を差し替える（来年の引き継ぎ、5 段目。デモの記録は 7 月なので）。
 * 一度付けた差し替えは、そのタブの中だけ（sessionStorage）で画面を移っても続く。値の形は Service（demoToday）が確かめる
 */
import { demoToday } from "@/services/last-season-handover";
import { isoToJstDate } from "@/services/last-season";

const KEY = "ear-to-ear:today";

export function readToday(): string {
  const fromUrl = demoToday(window.location.search);
  try {
    if (fromUrl !== null) window.sessionStorage.setItem(KEY, fromUrl);
    const kept = window.sessionStorage.getItem(KEY);
    if (kept !== null && demoToday(`?today=${kept}`) !== null) return kept;
  } catch {
    // 保存できない端末では URL だけで決める
  }
  return fromUrl ?? isoToJstDate(new Date().toISOString());
}
