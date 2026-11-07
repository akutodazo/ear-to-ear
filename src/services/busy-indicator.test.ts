// みっきぃ 2（#215）: 「更新」が一瞬で終わって押した手応えが無い。読み込みが速くても、最短の時間は「更新中」を見せる（純粋関数）
import { describe, expect, it } from "vitest";
import { BUSY_MIN_MS, busyVisible, busyEndsAt } from "./busy-indicator";

describe("busyVisible", () => {
  it("押していなければ、読み込み中かどうかだけ", () => {
    expect(busyVisible({ nowMs: 1000, pressedAtMs: null, loading: false })).toBe(false);
    expect(busyVisible({ nowMs: 1000, pressedAtMs: null, loading: true })).toBe(true);
  });

  it("300ms で読み終わっても、押してから最短の時間は見せる", () => {
    expect(busyVisible({ nowMs: 300, pressedAtMs: 0, loading: false })).toBe(true);
    expect(busyVisible({ nowMs: BUSY_MIN_MS - 1, pressedAtMs: 0, loading: false })).toBe(true);
  });

  it("最短の時間を過ぎて読み終わっていれば消す", () => {
    expect(busyVisible({ nowMs: BUSY_MIN_MS, pressedAtMs: 0, loading: false })).toBe(false);
  });

  it("最短の時間を過ぎても、読み込み中なら見せ続ける", () => {
    expect(busyVisible({ nowMs: 5000, pressedAtMs: 0, loading: true })).toBe(true);
  });
});

describe("busyEndsAt", () => {
  it("押した時刻に最短の時間を足す（押していなければ null）", () => {
    expect(busyEndsAt(1000)).toBe(1000 + BUSY_MIN_MS);
    expect(busyEndsAt(null)).toBeNull();
  });

  it("最短の時間は 0.5〜0.8 秒（遅く感じず、押した手応えはある長さ）", () => {
    expect(BUSY_MIN_MS).toBeGreaterThanOrEqual(500);
    expect(BUSY_MIN_MS).toBeLessThanOrEqual(800);
  });
});
