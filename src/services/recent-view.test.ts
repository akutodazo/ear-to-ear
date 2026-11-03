import { describe, expect, it } from "vitest";
import type { UploadedPhoto } from "@/types";
import { assignmentBadge, filterRecent, unconfirmedCountLabel } from "./recent-view";

function photo(change: Partial<UploadedPhoto> = {}): UploadedPhoto {
  return {
    id: "p1",
    fieldId: null,
    chosenFieldId: null,
    state: "unconfirmed",
    candidateFieldIds: [],
    takenAt: "2026-07-21",
    takenAtSource: "xmp",
    width: 1600,
    height: 1200,
    uploadedAt: "2026-11-03T01:00:00Z",
    uploaderDevice: "d1",
    ...change,
  };
}

describe("assignmentBadge（新着の印と番号。印で未確定か確定かを見分ける）", () => {
  it("未確定は印「未確定」と、一番近い候補を推定として", () => {
    expect(assignmentBadge(photo({ candidateFieldIds: ["A-06", "A-07"] }))).toEqual({
      tone: "pending",
      badge: "未確定",
      text: "推定 A-06",
    });
  });

  it("未確定で候補が無ければ「番号待ち」", () => {
    expect(assignmentBadge(photo())).toEqual({ tone: "pending", badge: "未確定", text: "番号待ち" });
  });

  it("委員が選んだ番号は出さない（11-03 の不承認のまま）", () => {
    expect(assignmentBadge(photo({ chosenFieldId: "A-11" })).text).toBe("番号待ち");
  });

  it("確定は印「確定」と番号", () => {
    expect(assignmentBadge(photo({ state: "confirmed", fieldId: "A-03", candidateFieldIds: ["A-04"] }))).toEqual({
      tone: "done",
      badge: "確定",
      text: "A-03",
    });
  });

  it("確定なのに番号が無ければ、矛盾として目立たせる", () => {
    expect(assignmentBadge(photo({ state: "confirmed" }))).toEqual({ tone: "alert", badge: "確定", text: "番号なし" });
  });
});

describe("filterRecent（未確定だけ見る）", () => {
  const list = [
    photo({ id: "a" }),
    photo({ id: "b", state: "confirmed", fieldId: "A-03" }),
    photo({ id: "c" }),
  ];

  it("切り替えが off なら全部、並びはそのまま", () => {
    expect(filterRecent(list, false).map((p) => p.id)).toEqual(["a", "b", "c"]);
  });

  it("on なら未確定だけ、並びはそのまま", () => {
    expect(filterRecent(list, true).map((p) => p.id)).toEqual(["a", "c"]);
  });

  it("元の配列は変えない", () => {
    const copy = [...list];
    filterRecent(list, true);
    expect(list).toEqual(copy);
  });
});

describe("unconfirmedCountLabel", () => {
  it.each([
    [0, "未確定の写真はありません"],
    [1, "未確定 1枚"],
    [12, "未確定 12枚"],
  ])("%i 枚は「%s」", (count, label) => {
    const list = Array.from({ length: count }, (_, i) => photo({ id: `p${i}` }));
    expect(unconfirmedCountLabel([...list, photo({ id: "x", state: "confirmed", fieldId: "A-01" })])).toBe(label);
  });
});
