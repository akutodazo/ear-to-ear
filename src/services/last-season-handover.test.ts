import { describe, expect, it } from "vitest";
import type { HandoverNote } from "@/types";
import type { SeasonRecord } from "./last-season";
import { demoToday, isNearLastSeason, lastSeasonMemoView, lastSeasonNoteFor } from "./last-season-handover";

// 来年の引き継ぎ（5 段目、11-05 本人決定）。昨年のメモを、昨年の判断の日の前後だけ出す。純粋関数
const note = (fieldId: string, season: string): HandoverNote => ({
  fieldId,
  season,
  records: [
    { kind: "status", id: "31", text: "[判断 31] 2025-07-20 収穫可能。理由: 穂の色・黄色い穂の割合。" },
    { kind: "photo", id: "p-2025-1", text: "[写真] 2025-07-18 撮影。判断 31 の根拠。" },
  ],
  blocks: [
    { text: "2025 年は 7/20 に穂の色と黄色い穂の割合から収穫可能と判断した。", cites: [{ start: 0, end: 1, citedText: "収穫可能" }] },
    { text: "7/18 の写真で穂の色をたどれる。", cites: [{ start: 1, end: 2, citedText: "撮影" }] },
    { text: "来年も同じ頃に一度見回るとよい。", cites: [] },
  ],
  model: "架空の例",
  createdAt: "2025-07-30T03:00:00.000Z",
});

const wheat = (readyAt: string | null, doneAt: string | null, crop = "小麦"): SeasonRecord => ({ season: "2025", fieldId: "A-03", crop, readyAt, doneAt });

describe("lastSeasonNoteFor（今年の 1 つ前の年のメモ）", () => {
  const notes = [note("A-03", "2025"), note("A-03", "2026"), note("A-04", "2024")];

  it("今年が 2026 なら 2025 のメモ", () => {
    expect(lastSeasonNoteFor(notes, "A-03", "2026")?.season).toBe("2025");
  });

  it("その年のメモが無ければ null（2 年前のメモは出さない）", () => {
    expect(lastSeasonNoteFor(notes, "A-04", "2026")).toBeNull();
    expect(lastSeasonNoteFor(notes, "A-05", "2026")).toBeNull();
  });

  it("年が数でなければ null", () => {
    expect(lastSeasonNoteFor(notes, "A-03", "今年")).toBeNull();
  });
});

describe("isNearLastSeason（昨年の判断の日の前後だけ）", () => {
  it("昨年の収穫可能の日（月日）の前後 7 日の中なら true。端を含む", () => {
    const r = wheat("2025-07-20", "2025-07-24");
    expect(isNearLastSeason(r, "2026-07-13", 7)).toBe(true);
    expect(isNearLastSeason(r, "2026-07-20", 7)).toBe(true);
    expect(isNearLastSeason(r, "2026-07-27", 7)).toBe(true);
  });

  it("前後 7 日の外なら false", () => {
    const r = wheat("2025-07-20", "2025-07-24");
    expect(isNearLastSeason(r, "2026-07-12", 7)).toBe(false);
    expect(isNearLastSeason(r, "2026-07-28", 7)).toBe(false);
    expect(isNearLastSeason(r, "2026-11-05", 7)).toBe(false);
  });

  it("収穫可能の日が無ければ収穫済の日で見る", () => {
    expect(isNearLastSeason(wheat(null, "2025-07-24"), "2026-07-30", 7)).toBe(true);
    expect(isNearLastSeason(wheat(null, "2025-07-24"), "2026-08-01", 7)).toBe(false);
  });

  it("記録が無い・判断の日が無い・小麦でない年は false", () => {
    expect(isNearLastSeason(null, "2026-07-20", 7)).toBe(false);
    expect(isNearLastSeason(wheat(null, null), "2026-07-20", 7)).toBe(false);
    expect(isNearLastSeason(wheat("2025-07-20", null, "大豆"), "2026-07-20", 7)).toBe(false);
  });

  it("今日が日付の形でなければ false", () => {
    expect(isNearLastSeason(wheat("2025-07-20", null), "7/20", 7)).toBe(false);
  });
});

describe("demoToday（デモで今日を差し替える ?today=YYYY-MM-DD）", () => {
  it("正しい日付だけ返す", () => {
    expect(demoToday("?today=2026-07-20")).toBe("2026-07-20");
    expect(demoToday("?x=1&today=2026-07-20")).toBe("2026-07-20");
  });

  it("無い・形が違う・ありえない日付は null", () => {
    expect(demoToday("")).toBeNull();
    expect(demoToday("?today=")).toBeNull();
    expect(demoToday("?today=2026-7-20")).toBeNull();
    expect(demoToday("?today=2026-13-01")).toBeNull();
    expect(demoToday("?today=2026-02-30")).toBeNull();
  });
});

describe("lastSeasonMemoView（昨年のメモを画面の形に）", () => {
  const view = lastSeasonMemoView(note("A-03", "2025"));

  it("年と、文ごとの出所の言葉。今年の札と区別するため年を入れる（精査 4 回目 #3）", () => {
    expect(view.season).toBe("2025");
    expect(view.sentences.map((s) => s.labels)).toStrictEqual([["2025/7/20 の判断"], ["2025/7/18 の写真"], []]);
    expect(view.sentences.map((s) => s.uncited)).toStrictEqual([false, false, true]);
  });

  it("印は今年の記録へのリンクにしない（href を持たない）", () => {
    for (const s of view.sentences) expect(Object.keys(s).sort()).toStrictEqual(["labels", "text", "uncited"]);
  });

  it("地図の板に出す 1 文目", () => {
    expect(view.first).toBe("2025 年は 7/20 に穂の色と黄色い穂の割合から収穫可能と判断した。");
  });

  it("文が無ければ 1 文目は null", () => {
    expect(lastSeasonMemoView({ ...note("A-03", "2025"), blocks: [{ text: " ", cites: [] }] }).first).toBeNull();
  });
});
