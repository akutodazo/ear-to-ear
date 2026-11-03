import { describe, expect, it } from "vitest";
import {
  assignmentLabel,
  candidateLabel,
  candidateSummary,
  distanceLabel,
  sendSummaryLabel,
  sendingProgressLabel,
  takenAtLabel,
  uploadOutcomeLabel,
} from "./photo-labels";
import type { UploadOutcome } from "@/repositories/interfaces/i-photo-repository";

describe("distanceLabel（候補までの距離）", () => {
  it.each([
    [120.4, "約120m"],
    [125, "約130m"],
    [3, "約10m"],
    [0, "約10m"],
    [994, "約990m"],
  ])("%s m は %s（10m 単位、最小は約10m）", (meters, label) => {
    expect(distanceLabel(meters)).toBe(label);
  });

  it.each([
    [996, "約1.0km"],
    [1234, "約1.2km"],
    [15_049, "約15.0km"],
  ])("%s m は %s（1km からは km で小数1桁）", (meters, label) => {
    expect(distanceLabel(meters)).toBe(label);
  });
});

describe("candidateLabel（候補の表示）", () => {
  it("番号と距離", () => {
    expect(candidateLabel("A-03", 120.4)).toBe("A-03（約120m）");
  });
});

describe("takenAtLabel（撮影日）", () => {
  it("日付は年月日（月と日の頭の 0 は付けない）", () => {
    expect(takenAtLabel("2026-07-21")).toBe("2026年7月21日");
    expect(takenAtLabel("2026-10-05")).toBe("2026年10月5日");
  });

  it("不明は「日付不明」（推測しない）", () => {
    expect(takenAtLabel(null)).toBe("日付不明");
  });
});

describe("assignmentLabel（新着の番号）", () => {
  const base = { fieldId: null, chosenFieldId: null, candidateFieldIds: [] as string[] };

  it("確定は番号だけ", () => {
    expect(assignmentLabel({ ...base, state: "confirmed", fieldId: "A-03", candidateFieldIds: ["A-04"] })).toBe(
      "確定 A-03",
    );
  });

  it("未確定は一番近い候補を推定として出す", () => {
    expect(assignmentLabel({ ...base, state: "unconfirmed", candidateFieldIds: ["A-03", "A-04"] })).toBe(
      "未確定（推定 A-03）",
    );
  });

  it("委員が選んだ番号は出さない（spec §7 の表示だけ。選んだ番号の出し方は決めていない）", () => {
    expect(
      assignmentLabel({ ...base, state: "unconfirmed", chosenFieldId: "A-05", candidateFieldIds: ["A-03"] }),
    ).toBe("未確定（推定 A-03）");
  });

  it("未確定で候補が無ければ「未確定」だけ", () => {
    expect(assignmentLabel({ ...base, state: "unconfirmed", chosenFieldId: "A-05" })).toBe("未確定");
  });

  it("確定なのに番号が無い記録は、矛盾として目立たせる", () => {
    expect(assignmentLabel({ ...base, state: "confirmed", candidateFieldIds: ["A-03"] })).toBe("確定（番号なし）");
  });
});

describe("uploadOutcomeLabel（送った結果）", () => {
  it.each<[UploadOutcome, string]>([
    [{ kind: "created", id: "x" }, "送りました"],
    [{ kind: "duplicate", id: "x" }, "同じ写真はもう送られています"],
    [{ kind: "unauthorized" }, "送るには合言葉が要ります"],
    [{ kind: "too-large" }, "写真が大きすぎて送れませんでした"],
    [{ kind: "rejected" }, "この写真は送れませんでした"],
    [{ kind: "network-error" }, "つながりませんでした。電波のよい所でもう一度送ってください"],
    [{ kind: "error" }, "送れませんでした。時間をおいてもう一度送ってください"],
  ])("%o は「%s」", (outcome, label) => {
    expect(uploadOutcomeLabel(outcome)).toBe(label);
  });
});

describe("candidateSummary（候補の出し方。数字は一番近い候補だけ。spec §7「数字は控えめに」）", () => {
  it("一番近い候補は距離つき、ほかは番号だけ", () => {
    expect(
      candidateSummary([
        { fieldId: "A-06", meters: 52 },
        { fieldId: "A-07", meters: 380 },
        { fieldId: "A-02", meters: 410 },
      ]),
    ).toEqual({ primary: "A-06（約50m）", others: "A-07・A-02" });
  });

  it("候補が1つならほかは null", () => {
    expect(candidateSummary([{ fieldId: "A-06", meters: 1234 }])).toEqual({ primary: "A-06（約1.2km）", others: null });
  });

  it("候補が無ければ null", () => {
    expect(candidateSummary([])).toBeNull();
  });
});

describe("sendSummaryLabel（送り終わった後のまとめ）", () => {
  it.each([
    [{ sent: 3, failed: 0 }, "3枚送りました"],
    [{ sent: 3, failed: 1 }, "3枚送りました。1枚は送れませんでした"],
    [{ sent: 0, failed: 2 }, "2枚は送れませんでした"],
  ])("%o は「%s」", (counts, label) => {
    expect(sendSummaryLabel(counts)).toBe(label);
  });

  it("送った写真も送れなかった写真も無ければ null（まとめを出さない）", () => {
    expect(sendSummaryLabel({ sent: 0, failed: 0 })).toBeNull();
  });
});

describe("sendingProgressLabel（送っている間の表示。Issue #69）", () => {
  it.each([
    [0, 3, "送っています…（1/3枚）"],
    [2, 3, "送っています…（3/3枚）"],
  ])("%i 枚済み・全 %i 枚は「%s」", (done, total, label) => {
    expect(sendingProgressLabel(done, total)).toBe(label);
  });

  it("1枚だけなら枚数を出さない", () => {
    expect(sendingProgressLabel(0, 1)).toBe("送っています…");
  });

  it("済みが全体を超えても、全体の枚数より大きくしない", () => {
    expect(sendingProgressLabel(5, 3)).toBe("送っています…（3/3枚）");
  });
});
