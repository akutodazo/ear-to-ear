import { describe, expect, it } from "vitest";
import type { UploadedPhoto } from "@/types";
import { daysOf, indexByDay, resolveSameDay, resolveSameField } from "./photo-compare";

// 見比べるの 2 つの比べ方（11-05、field-share の考え方を参考に、自分で書く）:
// 「同じ日に撮った別の畑と」（日をまたいで比べない。日が過ぎれば育つのは当たり前）と「この畑の前の日と」
let serial = 0;
function photo(fieldId: string, takenAt: string | null, uploadedAt = "2026-07-20T00:00:00.000Z", state: UploadedPhoto["state"] = "confirmed"): UploadedPhoto {
  serial += 1;
  return {
    id: `p${String(serial).padStart(3, "0")}`,
    fieldId,
    chosenFieldId: null,
    state,
    candidateFieldIds: [fieldId],
    takenAt,
    takenAtSource: takenAt === null ? "none" : "xmp",
    width: 1600,
    height: 1200,
    uploadedAt,
    uploaderDevice: "d",
  };
}

const byField = {
  "A-03": [photo("A-03", "2026-07-19"), photo("A-03", "2026-07-10")],
  "A-04": [photo("A-04", "2026-07-19", "2026-07-19T01:00:00.000Z"), photo("A-04", "2026-07-19", "2026-07-19T02:00:00.000Z"), photo("A-04", "2026-07-02"), photo("A-04", null)],
  "A-01": [photo("A-01", "2026-07-10"), photo("A-01", "2026-07-19", "2026-07-19T00:00:00.000Z", "unconfirmed")],
  "A-02": [],
};

describe("indexByDay（撮影日 → 畑 → その日の 1 枚）", () => {
  const days = indexByDay(byField);

  it("新しい日が先。日付不明と未確定は入れない", () => {
    expect(days.map((d) => d.takenAt)).toEqual(["2026-07-19", "2026-07-10", "2026-07-02"]);
  });

  it("同じ日に何枚もあれば、送った時刻の新しい 1 枚", () => {
    const day = days.find((d) => d.takenAt === "2026-07-19")!;
    expect(day.photos["A-04"]?.uploadedAt).toBe("2026-07-19T02:00:00.000Z");
    expect(Object.keys(day.photos).sort()).toEqual(["A-03", "A-04"]);
  });

  it("daysOf はその畑に写真がある日（新しい順）", () => {
    expect(daysOf(days, "A-04")).toEqual(["2026-07-19", "2026-07-02"]);
    expect(daysOf(days, "A-02")).toEqual([]);
  });
});

describe("resolveSameDay（同じ日に撮った別の畑と）", () => {
  const days = indexByDay(byField);
  const candidates = ["A-01", "A-02", "A-03", "A-04"];

  it("日付が無ければこの畑の最新の日。相手は目安（その日に写真があれば）", () => {
    const r = resolveSameDay(days, "A-04", {}, "A-03", candidates);
    expect(r.date).toBe("2026-07-19");
    expect(r.partnerId).toBe("A-03");
  });

  it("その日に目安の写真が無ければ、その日に写真がある別の畑。誰も無ければ null", () => {
    const r = resolveSameDay(days, "A-03", { date: "2026-07-10" }, "A-03", candidates);
    expect(r.date).toBe("2026-07-10");
    expect(r.partnerId).toBe("A-01");
    const none = resolveSameDay(days, "A-04", { date: "2026-07-02" }, "A-03", candidates);
    expect(none.partnerId).toBeNull();
  });

  it("指定の日にこの畑の写真が無ければ、最新の日に戻す。指定の相手は、その日に写真があれば使う", () => {
    const r = resolveSameDay(days, "A-04", { date: "2026-07-10", partner: "A-03" }, "A-03", candidates);
    expect(r.date).toBe("2026-07-19");
    expect(r.partnerId).toBe("A-03");
  });

  it("相手の選択肢は候補の順で、その日に写真が無い畑と自分は選べない", () => {
    const r = resolveSameDay(days, "A-04", {}, "A-03", candidates);
    expect(r.options).toEqual([
      { fieldId: "A-01", enabled: false },
      { fieldId: "A-02", enabled: false },
      { fieldId: "A-03", enabled: true },
    ]);
  });

  it("この畑に写真が無ければ、日付も相手も null", () => {
    const r = resolveSameDay(days, "A-02", {}, "A-03", candidates);
    expect(r).toEqual({ date: null, partnerId: null, options: [] });
  });
});

describe("resolveSameField（この畑の前の日と）", () => {
  const days = indexByDay(byField);

  it("下は選んだ日（既定は最新）、上はその前の日。上の候補は選んだ日以外", () => {
    const r = resolveSameField(days, "A-04", {});
    expect(r).toEqual({ date: "2026-07-19", earlier: "2026-07-02", earlierOptions: ["2026-07-02"] });
  });

  it("上を指定できる。選んだ日と同じ日は上にしない", () => {
    const r = resolveSameField(days, "A-03", { date: "2026-07-19", earlier: "2026-07-19" });
    expect(r.earlier).toBe("2026-07-10");
  });

  it("写真が 1 日分だけなら上は null。写真が無ければ全部 null", () => {
    expect(resolveSameField(days, "A-01", {})).toEqual({ date: "2026-07-10", earlier: null, earlierOptions: [] });
    expect(resolveSameField(days, "A-02", {})).toEqual({ date: null, earlier: null, earlierOptions: [] });
  });
});
