import { describe, expect, it } from "vitest";
import type { StatusEvent } from "@/types";
import { summarizeFields, type UnconfirmedPhotoRow } from "./field-summary";

function event(overrides: Partial<StatusEvent> = {}): StatusEvent {
  return {
    id: 1,
    fieldId: "A-01",
    status: "ready",
    reasons: ["ear_color"],
    note: null,
    refPhotoIds: [],
    actorDevice: "dev-member",
    at: "2026-07-21T01:00:00.000Z",
    revokedAt: null,
    ...overrides,
  };
}

function photo(candidates: string[], chosen: string | null = null): UnconfirmedPhotoRow {
  return { candidate_field_ids: JSON.stringify(candidates), chosen_field_id: chosen };
}

const FIELDS = ["A-01", "A-02", "A-03"];

describe("summarizeFields（GET /api/fields/summary のまとめ、T24）", () => {
  it("判断も写真も無ければ、全圃場が latest: null・hasUnconfirmed: false", () => {
    expect(summarizeFields(FIELDS, [], [])).toStrictEqual([
      { fieldId: "A-01", latest: null, hasUnconfirmed: false },
      { fieldId: "A-02", latest: null, hasUnconfirmed: false },
      { fieldId: "A-03", latest: null, hasUnconfirmed: false },
    ]);
  });

  it("並びは渡した圃場の順", () => {
    expect(summarizeFields(["A-03", "A-01", "A-02"], [], []).map((f) => f.fieldId)).toEqual(["A-03", "A-01", "A-02"]);
  });

  it("圃場が無ければ空の配列", () => {
    expect(summarizeFields([], [event()], [photo(["A-01"])])).toStrictEqual([]);
  });

  it("各項目は fieldId・latest・hasUnconfirmed の 3 つだけ", () => {
    for (const summary of summarizeFields(FIELDS, [event()], [photo(["A-01"])])) {
      expect(Object.keys(summary).sort()).toEqual(["fieldId", "hasUnconfirmed", "latest"]);
    }
  });

  it("latest は判断そのもの（9 項目のまま）", () => {
    const e = event({ id: 5, fieldId: "A-02", status: "done", reasons: [], note: "メモ", refPhotoIds: ["p1"] });
    expect(summarizeFields(FIELDS, [e], [])[1].latest).toStrictEqual(e);
  });

  it("latest は at が新しい判断（渡す順に関わらない）", () => {
    const older = event({ id: 9, at: "2026-07-20T01:00:00.000Z" });
    const newer = event({ id: 2, at: "2026-07-22T01:00:00.000Z" });
    const middle = event({ id: 5, at: "2026-07-21T01:00:00.000Z" });
    expect(summarizeFields(FIELDS, [older, newer, middle], [])[0].latest).toStrictEqual(newer);
    expect(summarizeFields(FIELDS, [newer, middle, older], [])[0].latest).toStrictEqual(newer);
    expect(summarizeFields(FIELDS, [middle, older, newer], [])[0].latest).toStrictEqual(newer);
  });

  it("at が同じなら id の大きい方（渡す順に関わらない）", () => {
    const small = event({ id: 3, status: "ready" });
    const large = event({ id: 7, status: "done" });
    expect(summarizeFields(FIELDS, [small, large], [])[0].latest).toStrictEqual(large);
    expect(summarizeFields(FIELDS, [large, small], [])[0].latest).toStrictEqual(large);
  });

  it("取り消した判断は見ない。いちばん新しいものが取り消し済みなら、その前の有効なもの", () => {
    const valid = event({ id: 1, at: "2026-07-20T01:00:00.000Z" });
    const revoked = event({ id: 2, at: "2026-07-22T01:00:00.000Z", revokedAt: "2026-07-22T02:00:00.000Z" });
    expect(summarizeFields(FIELDS, [valid, revoked], [])[0].latest).toStrictEqual(valid);
    expect(summarizeFields(FIELDS, [revoked, valid], [])[0].latest).toStrictEqual(valid);
  });

  it("全部取り消していれば latest: null", () => {
    const revoked = event({ revokedAt: "2026-07-22T02:00:00.000Z" });
    expect(summarizeFields(FIELDS, [revoked], [])[0].latest).toBeNull();
  });

  it("判断は自分の圃場の分だけ", () => {
    const a1 = event({ id: 1, fieldId: "A-01", at: "2026-07-20T01:00:00.000Z" });
    const a2 = event({ id: 2, fieldId: "A-02", at: "2026-07-25T01:00:00.000Z" });
    const result = summarizeFields(FIELDS, [a2, a1], []);
    expect(result[0].latest).toStrictEqual(a1);
    expect(result[1].latest).toStrictEqual(a2);
    expect(result[2].latest).toBeNull();
  });

  it("渡した圃場に無い番号の判断・写真は返さない", () => {
    const result = summarizeFields(["A-01"], [event({ fieldId: "Z-99" })], [photo(["Z-99"], "Z-99")]);
    expect(result).toStrictEqual([{ fieldId: "A-01", latest: null, hasUnconfirmed: false }]);
  });

  it("未確定の写真の候補の 1 位・2 位・3 位のどれでも印が付く（本人承認の A）", () => {
    expect(summarizeFields(FIELDS, [], [photo(["A-01"])]).map((f) => f.hasUnconfirmed)).toEqual([true, false, false]);
    expect(summarizeFields(FIELDS, [], [photo(["A-02", "A-01"])]).map((f) => f.hasUnconfirmed)).toEqual([
      true,
      true,
      false,
    ]);
    expect(summarizeFields(FIELDS, [], [photo(["A-02", "A-02x", "A-03"])]).map((f) => f.hasUnconfirmed)).toEqual([
      false,
      true,
      true,
    ]);
  });

  it("委員が選んだ番号だけでも印が付く（候補に無くても）", () => {
    expect(summarizeFields(FIELDS, [], [photo([], "A-03")]).map((f) => f.hasUnconfirmed)).toEqual([false, false, true]);
    expect(summarizeFields(FIELDS, [], [photo(["A-01"], "A-02")]).map((f) => f.hasUnconfirmed)).toEqual([
      true,
      true,
      false,
    ]);
  });

  it("複数の写真の印はまとめて付く", () => {
    expect(
      summarizeFields(FIELDS, [], [photo(["A-01"]), photo([], "A-03")]).map((f) => f.hasUnconfirmed),
    ).toEqual([true, false, true]);
  });

  it("番号は完全に一致するときだけ（大文字小文字・前後の空白を直さない）", () => {
    expect(
      summarizeFields(FIELDS, [], [photo(["a-01", " A-02", "A-03 "], "a-03")]).map((f) => f.hasUnconfirmed),
    ).toEqual([false, false, false]);
  });

  it("判断の印と写真の印は別々（判断がある圃場にも写真の印が付く）", () => {
    const result = summarizeFields(FIELDS, [event({ fieldId: "A-01" })], [photo(["A-01"])]);
    expect(result[0].latest).not.toBeNull();
    expect(result[0].hasUnconfirmed).toBe(true);
  });

  it.each([
    ["JSON でない", "secret-not-json"],
    ["配列でない", '{"secret":1}'],
    ["文字列でない要素", '["A-01",1]'],
    ["null", "null"],
  ])("候補の列が %s なら candidate_field_ids の名前の例外で、中身を入れない", (_label, text) => {
    const rows = [{ candidate_field_ids: text, chosen_field_id: null }];
    expect(() => summarizeFields(FIELDS, [], rows)).toThrow(/candidate_field_ids/);
    expect(() => summarizeFields(FIELDS, [], rows)).not.toThrow(/secret/);
  });

  // 攻撃役（T24 の 2 回目）: 先頭の行だけ検査しても通った
  it.each([
    ["JSON でない", "secret-not-json"],
    ["配列でない", '{"secret":1}'],
    ["文字列でない要素", "[1]"],
    ["null", "null"],
    ["文字列", '"secret"'],
  ])("2 行目以降の候補の列が %s でも candidate_field_ids の名前の例外で、中身を入れない", (_label, text) => {
    const rows = [photo(["A-01"]), photo(["A-02"]), { candidate_field_ids: text, chosen_field_id: null }];
    expect(() => summarizeFields(FIELDS, [], rows)).toThrow(/candidate_field_ids/);
    expect(() => summarizeFields(FIELDS, [], rows)).not.toThrow(/secret/);
  });

  it("渡したものを書き換えない", () => {
    const events = [event({ id: 2, at: "2026-07-22T01:00:00.000Z" }), event({ id: 1 })];
    const rows = [photo(["A-01"])];
    const fields = [...FIELDS];
    const before = JSON.stringify([fields, events, rows]);
    summarizeFields(fields, events, rows);
    expect(JSON.stringify([fields, events, rows])).toBe(before);
  });
});
