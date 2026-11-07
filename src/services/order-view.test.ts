import { describe, expect, it } from "vitest";
import { moveOptions, orderBarAction, orderHeadline, shareButtonLabel } from "./order-view";

describe("orderBarAction（順番の下の固定の帯の主ボタン 1 つ、#196）", () => {
  const base = { loading: false, hasRanked: true, dirty: true, savedState: null, differsFromConfirmed: false, isAdmin: false } as const;

  it("委員の並べ途中は「この順で保存」", () => {
    expect(orderBarAction(base)).toBe("save");
  });

  it("委員で保存して変えていなければ「保存しました」", () => {
    expect(orderBarAction({ ...base, dirty: false, savedState: "draft" })).toBe("saved");
  });

  it("委員長の並べ途中・下書きは「この順で確定」", () => {
    expect(orderBarAction({ ...base, isAdmin: true })).toBe("confirm");
    expect(orderBarAction({ ...base, isAdmin: true, dirty: false, savedState: "draft" })).toBe("confirm");
  });

  it("委員長で確定した順と違えば「確定し直す」", () => {
    expect(orderBarAction({ ...base, isAdmin: true, savedState: "confirmed", differsFromConfirmed: true })).toBe("reconfirm");
  });

  it("確定した順のままなら誰でも LINE", () => {
    expect(orderBarAction({ ...base, dirty: false, savedState: "confirmed" })).toBe("share");
    expect(orderBarAction({ ...base, isAdmin: true, dirty: false, savedState: "confirmed" })).toBe("share");
  });

  it("順位が 0 の委員長は確定できない、読み込み中は帯を出さない", () => {
    expect(orderBarAction({ ...base, isAdmin: true, hasRanked: false })).toBe("confirm-disabled");
    expect(orderBarAction({ ...base, loading: true })).toBe("none");
  });
});

describe("orderHeadline（状態の行）", () => {
  it("下書き・確定・違う", () => {
    expect(orderHeadline({ savedState: null, savedAt: null, differsFromConfirmed: false, dirty: false })).toBe("記録から並べた下書き");
    expect(orderHeadline({ savedState: "draft", savedAt: "2026-11-06T03:00:00.000Z", differsFromConfirmed: false, dirty: false })).toBe("11/6 に保存した下書き");
    expect(orderHeadline({ savedState: "confirmed", savedAt: "2026-11-06T03:00:00.000Z", differsFromConfirmed: false, dirty: false })).toBe("11/6 に確定した順");
    expect(orderHeadline({ savedState: "confirmed", savedAt: "2026-11-06T03:00:00.000Z", differsFromConfirmed: true, dirty: true })).toBe("確定した順と違います");
    expect(orderHeadline({ savedState: "draft", savedAt: "2026-11-06T03:00:00.000Z", differsFromConfirmed: false, dirty: true })).toBe("並べ途中（保存していません）");
  });
});

describe("moveOptions（持ち手を押すだけで開く動かし方。ドラッグの代わり、WCAG 2.5.7）", () => {
  it("真ん中の畑は 4 つとも動ける", () => {
    expect(moveOptions(1, 3)).toStrictEqual([
      { label: "先頭へ", to: 0, disabled: false },
      { label: "1 つ上へ", to: 0, disabled: false },
      { label: "1 つ下へ", to: 2, disabled: false },
      { label: "最後へ", to: 2, disabled: false },
    ]);
  });

  it("先頭と最後は動けない方を押せなくする", () => {
    expect(moveOptions(0, 3).map((o) => o.disabled)).toEqual([true, true, false, false]);
    expect(moveOptions(2, 3).map((o) => o.disabled)).toEqual([false, false, true, true]);
  });
});

describe("shareButtonLabel（帯の LINE のボタンの言葉）", () => {
  it("段に合わせて", () => {
    expect(shareButtonLabel("drawing", "none")).toBe("地図の絵を作っています…");
    expect(shareButtonLabel("ready", "none")).toBe("LINE で送る準備");
    expect(shareButtonLabel("ready", "uploading")).toBe("共有の URL を作っています…");
    expect(shareButtonLabel("ready", "ready")).toBe("LINE で送る");
    expect(shareButtonLabel("error", "none")).toBe("地図の絵を作れませんでした");
  });
});
