/**
 * 回数の上限（docs/spec.md §6）。いまは合言葉の失敗の枠だけ。Claude・LINE の回数は後で足す。
 * 時刻はミリ秒で受け取り、日付と枠は UTC（誰にも見せない値なので時差を持ち込まない）。
 */
import { LOGIN_WINDOW_MINUTES } from "../config";

/** 合言葉の失敗を数える枠の長さ（ミリ秒） */
export const LOGIN_WINDOW_MS = LOGIN_WINDOW_MINUTES * 60_000;

/** 合言葉の失敗を数える固定の枠 */
export interface LoginWindow {
  /** 枠の始まりの UTC "YYYY-MM-DDTHH:MM"（分は 10 の倍数） */
  slot: string;
  startMs: number;
  /** startMs + LOGIN_WINDOW_MS */
  endMs: number;
  /** endMs の ISO 8601（usage_counters.expires_at） */
  expiresAt: string;
}

/** UTC の日付 "YYYY-MM-DD"（hashIp の塩） */
export function utcDay(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

/** nowMs を含む固定の枠 */
export function loginWindow(nowMs: number): LoginWindow {
  const startMs = Math.floor(nowMs / LOGIN_WINDOW_MS) * LOGIN_WINDOW_MS;
  const endMs = startMs + LOGIN_WINDOW_MS;
  return {
    slot: new Date(startMs).toISOString().slice(0, 16),
    startMs,
    endMs,
    expiresAt: new Date(endMs).toISOString(),
  };
}

/** usage_counters の key。`login:<IPのハッシュ>:<枠>` */
export function loginCounterKey(ipHash: string, slot: string): string {
  return `login:${ipHash}:${slot}`;
}

/** Retry-After の秒。枠の終わりまでを切り上げ、最小 1 */
export function retryAfterSec(window: LoginWindow, nowMs: number): number {
  return Math.max(1, Math.ceil((window.endMs - nowMs) / 1000));
}

/** Claude の 1 日の回数の key。`claude:<日本時間の日付 YYYY-MM-DD>`（環境全体で 1 つ、T31） */
export function claudeCounterKey(_nowMs: number): string {
  throw new Error("未実装");
}

/** nowMs を含む日本時間の日の終わり（翌日の日本時間 0 時）の ISO 8601（usage_counters.expires_at、T31） */
export function claudeDayEndsAt(_nowMs: number): string {
  throw new Error("未実装");
}
