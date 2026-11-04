import { describe, expect, it, vi } from "vitest";
import { inputErrorLabel, reasonsLabel } from "./status-view";

// 上限と選択肢を変えたら言葉も追従することを、設定を差し替えて確かめる（200・5・選択肢の直書きを防ぐ）
vi.mock("@/config", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/config")>()),
  STATUS_NOTE_MAX_CHARS: 3,
  STATUS_REF_PHOTOS_MAX: 2,
  STATUS_REASONS: [
    { code: "aa", label: "甲" },
    { code: "bb", label: "乙" },
  ],
}));

describe("status-view: 設定に従う（L1）", () => {
  it("上限の言葉は STATUS_NOTE_MAX_CHARS・STATUS_REF_PHOTOS_MAX に従う", () => {
    expect(inputErrorLabel("note_too_long")).toContain("3字");
    expect(inputErrorLabel("too_many_ref_photos")).toContain("2枚");
  });

  it("理由の言葉は STATUS_REASONS に従う", () => {
    expect(reasonsLabel(["bb", "aa"])).toBe("乙・甲");
    expect(reasonsLabel(["ear_color"])).toBe("ear_color");
  });
});
