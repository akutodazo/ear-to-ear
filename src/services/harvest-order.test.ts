import { describe, expect, it } from "vitest";
import type { Field, FieldSummary, StatusEvent, UploadedPhoto } from "@/types";
import type { SeasonRecord } from "./last-season";
import { applySaved, draftOrder, moveTo, moveWithin, nextToShoot, orderRows, rankOrUnrank, sameOrder, type OrderDraft } from "./harvest-order";

// 刈る順番の下書き（11-05、3 段目）。記録から並べるだけで、写真や AI から収穫の時期を推測しない。
// 順位を付けるのは今年「収穫可能」と人が判断した畑だけ。判断の無い畑は順位を付けず、人が動かす
const f = (id: string, name: string): Field => ({ id, name, lat: 43.24, lng: 141.75, district: "北地区" });
const fields = [f("A-01", "北の1"), f("A-02", "北の2"), f("A-03", "北の3"), f("A-04", "北の4"), f("A-05", "北の5")];

function event(fieldId: string, status: StatusEvent["status"], at: string): StatusEvent {
  return { id: 1, fieldId, status, reasons: [], note: null, refPhotoIds: [], actorDevice: "d", at, revokedAt: null };
}
function summary(fieldId: string, latest: StatusEvent | null): FieldSummary {
  return { fieldId, latest, hasUnconfirmed: false };
}
function photo(fieldId: string, takenAt: string | null): UploadedPhoto {
  return {
    id: `${fieldId}-${takenAt}`,
    fieldId,
    chosenFieldId: null,
    state: "confirmed",
    candidateFieldIds: [fieldId],
    takenAt,
    takenAtSource: "xmp",
    width: 1600,
    height: 1200,
    uploadedAt: "2026-07-20T00:00:00.000Z",
    uploaderDevice: "d",
  };
}

const summaries = [
  summary("A-01", null),
  summary("A-02", null),
  // 日本時間 7/21 と 7/22（UTC では前日の夜）
  summary("A-03", event("A-03", "ready", "2026-07-21T01:00:00.000Z")),
  summary("A-04", event("A-04", "ready", "2026-07-21T20:00:00.000Z")),
  summary("A-05", event("A-05", "done", "2026-07-24T01:00:00.000Z")),
];
const lastSeason: SeasonRecord[] = [
  { season: "2025", fieldId: "A-01", crop: "小麦", readyAt: "2025-07-26", doneAt: null },
  { season: "2025", fieldId: "A-02", crop: "小麦", readyAt: "2025-07-23", doneAt: null },
  { season: "2025", fieldId: "A-03", crop: "大豆", readyAt: null, doneAt: null },
];
const photosByField = {
  "A-01": [photo("A-01", "2026-07-10"), photo("A-01", "2025-07-20")],
  "A-02": [photo("A-02", "2025-07-19")],
  "A-03": [photo("A-03", "2026-07-19")],
  "A-04": [photo("A-04", "2026-07-19"), photo("A-04", null)],
  "A-05": [],
};
const input = { fields, summaries, benchmarkId: "A-03", season: "2026", lastSeason, photosByField };

describe("orderRows（畑ごとの記録の行）", () => {
  const rows = orderRows(input);

  it("今年の判断の日付は日本時間の日付", () => {
    expect(rows["A-03"].readyAt).toBe("2026-07-21");
    expect(rows["A-04"].readyAt).toBe("2026-07-22");
    expect(rows["A-01"].readyAt).toBeNull();
  });

  it("昨年は小麦の年だけ使う（輪作）", () => {
    expect(rows["A-02"].lastReadyAt).toBe("2025-07-23");
    expect(rows["A-03"].lastReadyAt).toBeNull();
  });

  it("足りない記録: 判断が無い・今年の写真が無い（昨年の写真や日付不明は数えない）", () => {
    expect(rows["A-01"].missing).toEqual(["judgment"]);
    expect(rows["A-02"].missing).toEqual(["judgment", "photo"]);
    expect(rows["A-04"].missing).toEqual([]);
    expect(rows["A-04"].latestPhotoAt).toBe("2026-07-19");
  });

  it("記録の文は、ある記録だけを言う（推測の言葉を出さない）", () => {
    expect(rows["A-04"].lines).toEqual(["7/22 に収穫可能と判断"]);
    expect(rows["A-02"].lines).toEqual(["昨年 7/23 に収穫可能と判断"]);
    expect(rows["A-03"].lines).toEqual(["7/21 に収穫可能と判断", "昨年は大豆"]);
    const all = Object.values(rows).flatMap((r) => r.lines).join("\n");
    expect(all).not.toMatch(/予定|そう|見込み|成熟|水分|日後|日前/);
  });
});

describe("draftOrder（記録からの下書き）", () => {
  const rows = orderRows(input);

  it("順位は今年「収穫可能」と判断した畑だけ。判断の早い順", () => {
    expect(draftOrder(rows, fields).ranked).toEqual(["A-03", "A-04"]);
  });

  it("同じ日なら目安の畑を先、次に昨年の判断の早い順、最後は番号", () => {
    const sameDay = { ...input, summaries: [summary("A-01", event("A-01", "ready", "2026-07-21T02:00:00.000Z")), summary("A-02", event("A-02", "ready", "2026-07-21T03:00:00.000Z")), summary("A-03", event("A-03", "ready", "2026-07-21T04:00:00.000Z")), summary("A-04", null), summary("A-05", null)] };
    expect(draftOrder(orderRows(sameDay), fields).ranked).toEqual(["A-03", "A-02", "A-01"]);
  });

  it("判断の無い畑は順位なし（昨年の判断の早い順、無ければ番号順）。収穫済は別", () => {
    const d = draftOrder(rows, fields);
    expect(d.unranked).toEqual(["A-02", "A-01"]);
    expect(d.done).toEqual(["A-05"]);
  });
});

describe("並べ替え（人が直す）", () => {
  it("moveWithin は上下に 1 つ動かす。端では動かない。元の配列は変えない", () => {
    const list = ["A-03", "A-04", "A-01"];
    expect(moveWithin(list, 2, -1)).toEqual(["A-03", "A-01", "A-04"]);
    expect(moveWithin(list, 0, -1)).toEqual(list);
    expect(moveWithin(list, 1, 5)).toEqual(["A-03", "A-01", "A-04"]);
    expect(list).toEqual(["A-03", "A-04", "A-01"]);
  });

  it("rankOrUnrank は順位なしの畑を順位の最後へ、順位の畑を順位なしの先頭へ", () => {
    const d: OrderDraft = { ranked: ["A-03"], unranked: ["A-02", "A-01"], done: ["A-05"] };
    expect(rankOrUnrank(d, "A-01")).toEqual({ ranked: ["A-03", "A-01"], unranked: ["A-02"], done: ["A-05"] });
    expect(rankOrUnrank(d, "A-03")).toEqual({ ranked: [], unranked: ["A-03", "A-02", "A-01"], done: ["A-05"] });
    expect(rankOrUnrank(d, "A-05")).toEqual(d);
  });

  it("sameOrder は順位の並びと順位なしの集まりが同じか", () => {
    const a: OrderDraft = { ranked: ["A-03", "A-04"], unranked: ["A-02", "A-01"], done: [] };
    expect(sameOrder(a, { ranked: ["A-03", "A-04"], unranked: ["A-01", "A-02"], done: [] })).toBe(true);
    expect(sameOrder(a, { ranked: ["A-04", "A-03"], unranked: ["A-02", "A-01"], done: [] })).toBe(false);
  });
});

describe("nextToShoot（次に撮る畑。記録から並べるだけ）", () => {
  it("今年の写真が無い畑が先、次に判断が無く最新の写真が古い順。収穫可能・収穫済は入れない", () => {
    expect(nextToShoot(orderRows(input))).toEqual(["A-02", "A-01"]);
  });
});

describe("moveTo（指で動かした先へ）", () => {
  it("from の畑を to の位置へ。範囲の外は端に丸める", () => {
    const list = ["A-01", "A-02", "A-03", "A-04"];
    expect(moveTo(list, 0, 2)).toEqual(["A-02", "A-03", "A-01", "A-04"]);
    expect(moveTo(list, 3, 0)).toEqual(["A-04", "A-01", "A-02", "A-03"]);
    expect(moveTo(list, 1, 99)).toEqual(["A-01", "A-03", "A-04", "A-02"]);
    expect(moveTo(list, 9, 0)).toEqual(list);
  });
});

describe("applySaved（保存した順を、今の記録に合わせる）", () => {
  const now: OrderDraft = { ranked: ["A-03", "A-04"], unranked: ["A-02", "A-01"], done: ["A-05"] };

  it("保存した並びを使い、収穫済になった畑は外し、保存に無い畑は順位なしの後ろに足す", () => {
    expect(applySaved(now, { ranked: ["A-04", "A-05", "A-03"], unranked: ["A-02"] })).toEqual({ ranked: ["A-04", "A-03"], unranked: ["A-02", "A-01"], done: ["A-05"] });
  });

  it("知らない畑・重なりは捨てる", () => {
    expect(applySaved(now, { ranked: ["A-99", "A-03", "A-03"], unranked: ["A-03", "A-01"] })).toEqual({ ranked: ["A-03"], unranked: ["A-01", "A-04", "A-02"], done: ["A-05"] });
  });
});
