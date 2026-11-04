import { describe, expect, it, vi } from "vitest";
import { parseStatusInput } from "./status-reason";

// 上限と選択肢を変えたら追従することを、設定を差し替えて確かめる（200・5・5 つのコードの直書きを防ぐ）
vi.mock("@/config", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/config")>()),
  STATUS_NOTE_MAX_CHARS: 3,
  STATUS_REF_PHOTOS_MAX: 2,
  STATUS_REASONS: [
    { code: "aa", label: "甲" },
    { code: "bb", label: "乙" },
  ],
}));

const MINE = new Set(["p1", "p2", "p3"]);

function reasonOf(change: Record<string, unknown>): string {
  const result = parseStatusInput({ status: "ready", reasons: [], refPhotoIds: [], ...change }, MINE);
  return result.ok ? "ok" : result.reason;
}

describe("parseStatusInput: 設定に従う（T12）", () => {
  it("メモの上限は STATUS_NOTE_MAX_CHARS に従う", () => {
    expect(reasonOf({ note: "あいう" })).toBe("ok");
    expect(reasonOf({ note: "あいうえ" })).toBe("note_too_long");
  });

  it("根拠の写真の上限は STATUS_REF_PHOTOS_MAX に従う", () => {
    expect(reasonOf({ refPhotoIds: ["p1", "p2"] })).toBe("ok");
    expect(reasonOf({ refPhotoIds: ["p1", "p2", "p3"] })).toBe("too_many_ref_photos");
  });

  it("理由の選択肢は STATUS_REASONS に従う", () => {
    expect(reasonOf({ reasons: ["bb", "aa"] })).toBe("ok");
    expect(reasonOf({ reasons: ["ear_color"] })).toBe("unknown_reason");
  });
});
