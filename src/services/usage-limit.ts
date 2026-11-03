/**
 * 回数の上限（docs/spec.md §6）。いまは合言葉の失敗の枠だけ。Claude・LINE の回数は後で足す。
 * 時刻はミリ秒で受け取り、日付と枠は UTC（誰にも見せない値なので時差を持ち込まない）。
 */
import { LOGIN_MAX_ATTEMPTS_PER_WINDOW, LOGIN_WINDOW_MINUTES } from "../config";

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
  void nowMs;
  throw new Error("not implemented");
}

/** nowMs を含む固定の枠 */
export function loginWindow(nowMs: number): LoginWindow {
  void nowMs;
  throw new Error("not implemented");
}

/** usage_counters の key。`login:<IPのハッシュ>:<枠>` */
export function loginCounterKey(ipHash: string, slot: string): string {
  void ipHash;
  void slot;
  throw new Error("not implemented");
}

/** 枠の失敗の数が上限に達しているか（達していれば 429） */
export function isLoginLimited(count: number): boolean {
  void count;
  throw new Error("not implemented");
}

/** Retry-After の秒。枠の終わりまでを切り上げ、最小 1 */
export function retryAfterSec(window: LoginWindow, nowMs: number): number {
  void window;
  void nowMs;
  throw new Error("not implemented");
}
