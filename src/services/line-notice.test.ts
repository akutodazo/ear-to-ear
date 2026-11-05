import { describe, expect, it } from "vitest";
import type { StatusEvent } from "@/types";
import { lineNoticeText } from "./line-notice";

const URL_A03 = "https://example.invalid/fields/A-03";

function event(over: Partial<StatusEvent> = {}): StatusEvent {
  return {
    id: 41,
    fieldId: "A-03",
    status: "ready",
    reasons: ["ear_color", "yellow_ratio"],
    note: "MEMO_SHOULD_NOT_APPEAR",
    refPhotoIds: ["PHOTO_ID_SHOULD_NOT_APPEAR"],
    actorDevice: "DEVICE_SHOULD_NOT_APPEAR",
    at: "2026-11-06T05:30:00.000Z",
    revokedAt: null,
    ...over,
  };
}

const line = (text: string, n: number) => text.split("\n")[n];

describe("lineNoticeText: 記録（L8）", () => {
  it("番号と状態・理由・日本時間・URL の 4 行", () => {
    expect(lineNoticeText(event(), "recorded", URL_A03)).toBe(
      ["A-03 収穫可能", "理由: 穂の色・黄色い穂の割合", "11/6 14:30", URL_A03].join("\n"),
    );
  });

  it("収穫済", () => {
    const text = lineNoticeText(event({ status: "done", reasons: ["ja_stop_moisture"] }), "recorded", URL_A03);
    expect(line(text, 0)).toBe("A-03 収穫済");
    expect(line(text, 1)).toBe("理由: 農協の判定で中止（水分超過）");
  });

  it("理由が空なら「理由: 記録なし」", () => {
    expect(line(lineNoticeText(event({ reasons: [] }), "recorded", URL_A03), 1)).toBe("理由: 記録なし");
  });

  it("知らないコードは出さない。すべて知らなければ「記録なし」", () => {
    expect(line(lineNoticeText(event({ reasons: ["UNKNOWN_CODE", "other"] }), "recorded", URL_A03), 1)).toBe(
      "理由: その他",
    );
    const text = lineNoticeText(event({ reasons: ["UNKNOWN_CODE"] }), "recorded", URL_A03);
    expect(line(text, 1)).toBe("理由: 記録なし");
    expect(text).not.toContain("UNKNOWN_CODE");
  });

  it("日本時間の日付をまたぐ（UTC 11/30 15:05 は 12/1 0:05）", () => {
    expect(line(lineNoticeText(event({ at: "2026-11-30T15:05:00.000Z" }), "recorded", URL_A03), 2)).toBe("12/1 0:05");
  });
});

describe("lineNoticeText: 取り消し（L8）", () => {
  it("「取り消しました」と取り消しの日本時間と URL の 3 行", () => {
    const text = lineNoticeText(event({ revokedAt: "2026-11-06T07:02:00.000Z" }), "revoked", URL_A03);
    expect(text).toBe(["A-03 「収穫可能」の判断を取り消しました", "11/6 16:02", URL_A03].join("\n"));
  });

  it("収穫済の取り消し", () => {
    const text = lineNoticeText(event({ status: "done", revokedAt: "2026-11-06T07:02:00.000Z" }), "revoked", URL_A03);
    expect(line(text, 0)).toBe("A-03 「収穫済」の判断を取り消しました");
  });

  it("revokedAt が無ければ at の時刻", () => {
    expect(line(lineNoticeText(event(), "revoked", URL_A03), 1)).toBe("11/6 14:30");
  });
});

describe("lineNoticeText: 載せないもの（L8、AGENTS.md §1）", () => {
  it.each(["recorded", "revoked"] as const)("%s: note・refPhotoIds・actorDevice・id を出さない", (kind) => {
    const text = lineNoticeText(event({ id: 98765, revokedAt: "2026-11-06T07:02:00.000Z" }), kind, URL_A03);
    expect(text).not.toContain("MEMO_SHOULD_NOT_APPEAR");
    expect(text).not.toContain("PHOTO_ID_SHOULD_NOT_APPEAR");
    expect(text).not.toContain("DEVICE_SHOULD_NOT_APPEAR");
    expect(text).not.toContain("98765");
  });
});
