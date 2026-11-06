import { describe, expect, it } from "vitest";
import type { CreateOrderShareOutcome } from "@/repositories/interfaces/i-order-share-repository";
import { createShareOutcomeLabel, lineShareHref, shareData } from "./order-share-view";

describe("shareData（端末の共有に渡すもの）", () => {
  it("text と url を分けて渡す。text に URL を入れない（LINE で二重にしない）", () => {
    const url = "https://example.test/api/shares/abc";
    const data = shareData("北地区の刈る順番\n1. A-01", url);
    expect(data).toStrictEqual({ text: "北地区の刈る順番\n1. A-01", url });
    expect(data.text).not.toContain(url);
  });
});

describe("lineShareHref（共有が無い端末の代わり）", () => {
  it("文の後に改行と URL を付けて line.me/R/share に渡す", () => {
    const href = lineShareHref("順番\n1. A-01", "https://example.test/api/shares/abc");
    expect(href.startsWith("https://line.me/R/share?text=")).toBe(true);
    expect(decodeURIComponent(href.slice("https://line.me/R/share?text=".length))).toBe(
      "順番\n1. A-01\nhttps://example.test/api/shares/abc",
    );
  });
});

describe("createShareOutcomeLabel（送る準備の失敗の言葉）", () => {
  const cases: [CreateOrderShareOutcome, string | null][] = [
    [{ kind: "created", share: { id: "a", url: "https://x", expiresAt: "y" } }, null],
    [{ kind: "unauthorized" }, "共有の URL を作るには合言葉が要ります"],
    [{ kind: "usage-limit" }, "今日はこれ以上作れません（日本時間の 0 時に戻ります）"],
    [{ kind: "too-large" }, "絵が大きすぎて送れませんでした"],
    [{ kind: "rejected", reason: "unknown_field" }, "絵を送れませんでした（形が違います）"],
    [{ kind: "network-error" }, "つながりませんでした。電波のよい所でもう一度"],
    [{ kind: "error" }, "うまくいきませんでした。時間をおいてもう一度"],
  ];
  it.each(cases)("%o → %s", (outcome, label) => {
    expect(createShareOutcomeLabel(outcome)).toBe(label);
  });
});
