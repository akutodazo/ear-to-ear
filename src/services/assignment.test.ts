import { describe, expect, it } from "vitest";
import fieldsData from "@/data/fields.json";
import type { Field, UploadedPhoto } from "@/types";
import type { AssignOutcome } from "@/repositories/interfaces/i-photo-repository";
import {
  applyAssignment,
  assignButtonLabel,
  assignmentOptionGroups,
  assignOutcomeLabel,
  canAssign,
  initialAssignment,
} from "./assignment";

const fields: Field[] = fieldsData;

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

const ids = (group: { options: { fieldId: string }[] }) => group.options.map((o) => o.fieldId);

describe("assignmentOptionGroups（番号の選択肢）", () => {
  it("候補を「推定」として近い順に先に出し、残りを地区ごとに圃場一覧の順で出す", () => {
    const groups = assignmentOptionGroups(photo({ candidateFieldIds: ["A-06", "A-02", "A-07"] }), fields);
    expect(groups.map((g) => g.label)).toEqual(["推定", "北地区", "中地区", "南地区"]);
    expect(ids(groups[0])).toEqual(["A-06", "A-02", "A-07"]);
    expect(ids(groups[1])).toEqual(["A-01", "A-03", "A-04"]);
    expect(ids(groups[2])).toEqual(["A-05", "A-08"]);
    expect(ids(groups[3])).toEqual(["A-09", "A-10", "A-11", "A-12"]);
  });

  it("どの番号もちょうど1回ずつ出る", () => {
    const groups = assignmentOptionGroups(photo({ candidateFieldIds: ["A-12", "A-01"] }), fields);
    const all = groups.flatMap(ids);
    expect([...all].sort()).toEqual(fields.map((f) => f.id).sort());
  });

  it("選択肢の文言は番号と名前（例 A-06 中の2）", () => {
    const groups = assignmentOptionGroups(photo({ candidateFieldIds: ["A-06"] }), fields);
    expect(groups[0].options[0]).toEqual({ fieldId: "A-06", label: "A-06 中の2" });
  });

  it("候補が無ければ「推定」は出さない", () => {
    const groups = assignmentOptionGroups(photo(), fields);
    expect(groups.map((g) => g.label)).toEqual(["北地区", "中地区", "南地区"]);
  });

  it("一覧に無い候補（古い番号など）は出さない", () => {
    const groups = assignmentOptionGroups(photo({ candidateFieldIds: ["Z-99", "A-03"] }), fields);
    expect(ids(groups[0])).toEqual(["A-03"]);
  });

  it("委員が選んだ番号は前に出さない（選んだ番号の表示は不承認、11-03）", () => {
    const groups = assignmentOptionGroups(photo({ chosenFieldId: "A-11" }), fields);
    expect(groups[0].label).toBe("北地区");
    expect(ids(groups[2])).toContain("A-11");
  });
});

describe("initialAssignment（最初に選んでおく番号）", () => {
  it("確定済みはその番号", () => {
    expect(initialAssignment(photo({ state: "confirmed", fieldId: "A-04", candidateFieldIds: ["A-06"] }), fields)).toBe(
      "A-04",
    );
  });

  it("未確定は一番近い候補", () => {
    expect(initialAssignment(photo({ candidateFieldIds: ["A-06", "A-02"] }), fields)).toBe("A-06");
  });

  it("一覧に無い候補は飛ばす", () => {
    expect(initialAssignment(photo({ candidateFieldIds: ["Z-99", "A-02"] }), fields)).toBe("A-02");
  });

  it("候補が無ければ \"\"（推測で選ばない）。委員が選んだ番号も使わない", () => {
    expect(initialAssignment(photo({ chosenFieldId: "A-11" }), fields)).toBe("");
  });

  it("確定済みなのに番号が無ければ、候補から", () => {
    expect(initialAssignment(photo({ state: "confirmed", fieldId: null, candidateFieldIds: ["A-05"] }), fields)).toBe(
      "A-05",
    );
  });
});

describe("assignButtonLabel", () => {
  it("未確定は「確定」、確定済みは「変更」", () => {
    expect(assignButtonLabel(photo())).toBe("確定");
    expect(assignButtonLabel(photo({ state: "confirmed", fieldId: "A-01" }))).toBe("変更");
  });
});

describe("canAssign（押せるか）", () => {
  it("未確定の写真に一覧の番号なら押せる", () => {
    expect(canAssign(photo(), "A-06", fields)).toBe(true);
  });

  it("選んでいない・一覧に無い番号は押せない", () => {
    expect(canAssign(photo(), "", fields)).toBe(false);
    expect(canAssign(photo(), "Z-99", fields)).toBe(false);
  });

  it("確定済みと同じ番号には変えられない（履歴に意味の無い行を残さない）", () => {
    const confirmed = photo({ state: "confirmed", fieldId: "A-06" });
    expect(canAssign(confirmed, "A-06", fields)).toBe(false);
    expect(canAssign(confirmed, "A-07", fields)).toBe(true);
  });

  it("未確定なら、委員が選んだ番号や一番近い候補と同じでも押せる（確定は別のこと）", () => {
    expect(canAssign(photo({ chosenFieldId: "A-06", candidateFieldIds: ["A-06"] }), "A-06", fields)).toBe(true);
  });
});

describe("applyAssignment（通った後の一覧）", () => {
  it("その写真だけを確定にして番号を替える。ほかの項目と、ほかの写真はそのまま", () => {
    const a = photo({ id: "a", candidateFieldIds: ["A-06"], chosenFieldId: "A-02" });
    const b = photo({ id: "b" });
    const next = applyAssignment([a, b], "a", "A-07");
    expect(next[0]).toEqual({ ...a, state: "confirmed", fieldId: "A-07" });
    expect(next[1]).toBe(b);
  });

  it("元の配列と写真は変えない", () => {
    const a = photo({ id: "a" });
    const list = [a];
    applyAssignment(list, "a", "A-07");
    expect(list[0]).toBe(a);
    expect(a.state).toBe("unconfirmed");
    expect(a.fieldId).toBeNull();
  });

  it("無い id なら同じ中身の一覧", () => {
    const a = photo({ id: "a" });
    expect(applyAssignment([a], "x", "A-07")).toEqual([a]);
  });
});

describe("assignOutcomeLabel", () => {
  it.each<[AssignOutcome, string]>([
    ["ok", "A-06 に決めました"],
    ["unauthorized", "管理者の合言葉を入れてください"],
    ["forbidden", "管理者の合言葉で入り直してください"],
    ["not-found", "この写真は見つかりませんでした。「更新」を押してください"],
    ["rejected", "この番号には決められませんでした"],
    ["network-error", "つながりませんでした。電波のよい所でもう一度"],
    ["error", "うまくいきませんでした。時間をおいてもう一度"],
  ])("%s は「%s」", (outcome, label) => {
    expect(assignOutcomeLabel(outcome, "A-06")).toBe(label);
  });
});
