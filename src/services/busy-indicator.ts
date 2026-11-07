/**
 * 押した手応えのための「更新中」の見せ方（みっきぃ 2、#215）。純粋関数。
 * 読み込みが一瞬で終わっても、押してから最短の時間は「更新中」を見せる（終わったことに気付けるように）
 */

/** 最短の時間。遅く感じない長さで、押した手応えが残る長さ */
export const BUSY_MIN_MS = 600;

export function busyVisible(input: { nowMs: number; pressedAtMs: number | null; loading: boolean }): boolean {
  const { nowMs, pressedAtMs, loading } = input;
  if (loading) return true;
  if (pressedAtMs === null) return false;
  return nowMs - pressedAtMs < BUSY_MIN_MS;
}

/** 最短の時間が終わる時刻（押していなければ null） */
export function busyEndsAt(pressedAtMs: number | null): number | null {
  return pressedAtMs === null ? null : pressedAtMs + BUSY_MIN_MS;
}
