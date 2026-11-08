import { describe, expect, it } from "vitest";
import type { StatusEvent } from "@/types";
import { heroMeta, judgmentLine, latestLiveEvent, rankLineView, readFieldView, showHandoverTo } from "./detail-view";

describe("judgmentLine（詳細の判断の行、#195）", () => {
  it("最新の判断を「月/日 に 状態 と判断」で", () => {
    expect(judgmentLine({ status: "ready", at: "2026-11-05T01:00:00.000Z" })).toBe("11/5 に収穫可能と判断");
    expect(judgmentLine({ status: "done", at: "2026-11-07T15:30:00.000Z" })).toBe("11/8 に収穫済と判断");
  });

  it("判断が無ければ", () => {
    expect(judgmentLine(null)).toBe("判断はまだありません");
  });
});

describe("heroMeta（主役の写真の右下）", () => {
  it("今年の写真は 月/日 撮影・枚数", () => {
    expect(heroMeta("2026-07-24", 3, "2026")).toBe("7/24 撮影・3 枚");
  });

  it("今年でない写真は年を付ける（昨年の写真を今年の様子に見せない）", () => {
    expect(heroMeta("2025-07-24", 1, "2026")).toBe("2025年 7/24 撮影・1 枚");
  });

  it("撮影日が分からない", () => {
    expect(heroMeta(null, 2, "2026")).toBe("撮影日不明・2 枚");
  });
});

describe("rankLineView（詳細の順番の段）", () => {
  it("下書きで順位あり", () => {
    expect(rankLineView({ rank: 2, state: "draft", confirmedAt: null })).toStrictEqual({
      title: "刈る順番 2 番目",
      sub: "下書き（この端末）",
      ring: "draft",
      action: "外す",
    });
  });

  it("確定した順のまま", () => {
    expect(rankLineView({ rank: 1, state: "confirmed", confirmedAt: "2026-11-06T03:00:00.000Z" })).toStrictEqual({
      title: "刈る順番 1 番目",
      sub: "11/6 に確定",
      ring: "confirmed",
      action: "外す",
    });
  });

  it("確定した順と違う", () => {
    expect(rankLineView({ rank: 3, state: "differs", confirmedAt: "2026-11-06T03:00:00.000Z" }).sub).toBe("並べ途中（確定した順と違います）");
  });

  it("順位なし", () => {
    expect(rankLineView({ rank: null, state: "draft", confirmedAt: null })).toStrictEqual({
      title: "刈る順番 順位なし",
      sub: null,
      ring: "none",
      action: "順位を付ける",
    });
  });
});

describe("readFieldView（# で詳細と比較を切り替える）", () => {
  it("#compare なら比較、ほかは詳細", () => {
    expect(readFieldView("#compare")).toBe("compare");
    expect(readFieldView("")).toBe("detail");
    expect(readFieldView("#last-season")).toBe("detail");
  });
});

describe("showHandoverTo（引き継ぎメモは管理者だけ。西田 PM 11-07）", () => {
  it("委員長だけ", () => {
    expect(showHandoverTo("admin")).toBe(true);
    expect(showHandoverTo("member")).toBe(false);
    expect(showHandoverTo(null)).toBe(false);
    expect(showHandoverTo(undefined)).toBe(false);
  });
});

// 詳細の判断の行に出す最新の判断（field-client から移す。#240）
describe("latestLiveEvent（取り消していない最新の判断）", () => {
  const event = (id: number, at: string, revokedAt: string | null = null, status: StatusEvent["status"] = "ready"): StatusEvent => ({
    id,
    fieldId: "A-03",
    status,
    reasons: [],
    note: null,
    refPhotoIds: [],
    actorDevice: "d",
    at,
    revokedAt,
  });

  it("記録が無ければ null", () => {
    expect(latestLiveEvent([])).toBeNull();
  });

  it("すべて取り消し済みなら null", () => {
    expect(latestLiveEvent([event(1, "2026-07-20T00:00:00.000Z", "2026-07-21T00:00:00.000Z")])).toBeNull();
  });

  it("時刻がいちばん新しいもの（並びの順に頼らない）", () => {
    const newest = event(1, "2026-07-22T00:00:00.000Z", null, "done");
    expect(latestLiveEvent([event(2, "2026-07-20T00:00:00.000Z"), newest, event(3, "2026-07-21T00:00:00.000Z")])).toBe(newest);
  });

  it("取り消した新しい判断は飛ばす", () => {
    const live = event(1, "2026-07-20T00:00:00.000Z");
    expect(latestLiveEvent([event(2, "2026-07-22T00:00:00.000Z", "2026-07-22T01:00:00.000Z"), live])).toBe(live);
  });

  it("同じ時刻なら id の大きいほう（後から記録したもの）", () => {
    const later = event(5, "2026-07-20T00:00:00.000Z", null, "done");
    expect(latestLiveEvent([later, event(4, "2026-07-20T00:00:00.000Z")])).toBe(later);
    expect(latestLiveEvent([event(4, "2026-07-20T00:00:00.000Z"), later])).toBe(later);
  });
});
