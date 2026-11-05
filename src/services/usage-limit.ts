/**
 * 回数の上限（docs/spec.md §6）。合言葉の失敗の枠と、Claude の 1 日の回数（T31）と、LINE の月の送信数（L8、K15）。
 * 時刻はミリ秒で受け取る。合言葉の枠は UTC（誰にも見せない値なので時差を持ち込まない）。
 * Claude の回数は日本時間の日ごと（委員の 1 日と合わせる。上限の Retry-After も日本時間 0 時まで）。
 * LINE の回数は日本時間の月ごと（無料枠の月 200 通の数え方に合わせる推定。LINE 側の区切りは確かめていない）。
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

/** 日本時間と UTC の差（ミリ秒） */
const JST_OFFSET_MS = 9 * 3600_000;

/** 1 日（ミリ秒） */
const DAY_MS = 24 * 3600_000;

/** Claude の 1 日の回数の key。`claude:<日本時間の日付 YYYY-MM-DD>`（環境全体で 1 つ、T31） */
export function claudeCounterKey(nowMs: number): string {
  return `claude:${new Date(nowMs + JST_OFFSET_MS).toISOString().slice(0, 10)}`;
}

/** nowMs を含む日本時間の日の終わり（翌日の日本時間 0 時）の ISO 8601（usage_counters.expires_at、T31） */
export function claudeDayEndsAt(nowMs: number): string {
  const dayStartJst = Math.floor((nowMs + JST_OFFSET_MS) / DAY_MS) * DAY_MS;
  return new Date(dayStartJst + DAY_MS - JST_OFFSET_MS).toISOString();
}

/** LINE の月の送信数の key。`line:<日本時間の YYYY-MM>`（環境全体で 1 つ、L8・K15） */
export function lineCounterKey(nowMs: number): string {
  return `line:${new Date(nowMs + JST_OFFSET_MS).toISOString().slice(0, 7)}`;
}

/** nowMs を含む日本時間の月の終わり（翌月 1 日の日本時間 0 時）の ISO 8601（usage_counters.expires_at、L8） */
export function lineMonthEndsAt(nowMs: number): string {
  const jst = new Date(nowMs + JST_OFFSET_MS);
  const nextMonthStartJst = Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth() + 1, 1);
  return new Date(nextMonthStartJst - JST_OFFSET_MS).toISOString();
}
