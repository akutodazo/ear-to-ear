// みっきぃ 7（#220）: 判断の LINE 通知をサムネイル付きに。判断ごとの OGP ページの URL と HTML（純粋関数）
import { describe, expect, it } from "vitest";
import type { StatusEvent } from "@/types";
import { judgmentPageHtml, judgmentUrl } from "./judgment-page";

const ORIGIN = "https://example.test";
const EVENT: StatusEvent = {
  id: 12,
  fieldId: "A-03",
  status: "ready",
  reasons: ["ear_color"],
  note: "南側が先に黄色い",
  refPhotoIds: ["p-1", "p-2"],
  actorDevice: "dev-secret-device",
  at: "2026-07-21T01:00:00.000Z",
  revokedAt: null,
};

describe("judgmentUrl", () => {
  it("記録は /api/judgments/<id>", () => {
    expect(judgmentUrl(ORIGIN, 12, "recorded")).toBe("https://example.test/api/judgments/12");
  });

  it("取り消しは別の URL（LINE はプレビューを URL ごとに覚える）", () => {
    expect(judgmentUrl(ORIGIN, 12, "revoked")).toBe("https://example.test/api/judgments/12?revoked=1");
  });
});

describe("judgmentPageHtml", () => {
  const photo = { id: "p-1", width: 1600, height: 1200 };

  it("og:image は根拠の写真の 1 枚目の絶対 URL", () => {
    const html = judgmentPageHtml({ origin: ORIGIN, event: EVENT, fieldName: "北の3", photo });
    expect(html).toContain('<meta property="og:image" content="https://example.test/api/photo-files/p-1">');
    expect(html).toContain('<meta property="og:image:width" content="1600">');
    expect(html).toContain('<meta property="og:title" content="A-03 北の3 収穫可能">');
  });

  it("写真が無い判断は og:image を出さない", () => {
    const html = judgmentPageHtml({ origin: ORIGIN, event: { ...EVENT, refPhotoIds: [] }, fieldName: "北の3", photo: null });
    expect(html).not.toContain("og:image");
    expect(html).not.toContain("<img");
  });

  it("理由の言葉と日本時間を載せる", () => {
    const html = judgmentPageHtml({ origin: ORIGIN, event: EVENT, fieldName: "北の3", photo });
    expect(html).toContain("穂の色");
    expect(html).toContain("7/21 10:00");
  });

  it("メモ・端末は載せない", () => {
    const html = judgmentPageHtml({ origin: ORIGIN, event: EVENT, fieldName: "北の3", photo });
    expect(html).not.toContain("南側が先に黄色い");
    expect(html).not.toContain("dev-secret-device");
  });

  it("取り消し済みなら題に「取り消しました」、記録と取り消しの両方の日時", () => {
    const revoked = { ...EVENT, revokedAt: "2026-07-22T03:30:00.000Z" };
    const html = judgmentPageHtml({ origin: ORIGIN, event: revoked, fieldName: "北の3", photo });
    expect(html).toContain('<meta property="og:title" content="A-03 北の3 「収穫可能」の判断を取り消しました">');
    expect(html).toContain("7/21 10:00");
    expect(html).toContain("7/22 12:30");
  });

  it("名前の < を壊さない", () => {
    const html = judgmentPageHtml({ origin: ORIGIN, event: EVENT, fieldName: "<b>", photo });
    expect(html).toContain("&lt;b&gt;");
    expect(html).not.toContain("<b>");
  });

  it("畑の詳細の画面への link がある", () => {
    const html = judgmentPageHtml({ origin: ORIGIN, event: EVENT, fieldName: "北の3", photo });
    expect(html).toContain('href="/fields/A-03"');
  });
});
