import { describe, expect, it } from "vitest";
import {
  ASSIGNMENT_BODY_MAX_BYTES,
  assignmentBodyStatus,
  parseAssignmentBody,
  type AssignmentBodyReason,
} from "./assignment-request";

const KNOWN = new Set(["A-01", "A-07", "A-12"]);

describe("parseAssignmentBody（確定・変更の本文）", () => {
  it("一覧にある番号なら ok", () => {
    expect(parseAssignmentBody('{"fieldId":"A-07"}', KNOWN)).toEqual({ ok: true, fieldId: "A-07" });
  });

  it.each<[string, string, AssignmentBodyReason]>([
    ["JSON でない", "fieldId=A-07", "not_json"],
    ["空", "", "not_json"],
    ["配列", '["A-07"]', "not_object"],
    ["null", "null", "not_object"],
    ["文字列", '"A-07"', "not_object"],
    ["ほかのキーがある", '{"fieldId":"A-07","state":"confirmed"}', "unknown_key"],
    ["__proto__ のキー", '{"fieldId":"A-07","__proto__":{}}', "unknown_key"],
    ["fieldId が無い", "{}", "missing_field_id"],
    ["数値", '{"fieldId":7}', "bad_field_id"],
    ["null の番号", '{"fieldId":null}', "bad_field_id"],
    ["空文字", '{"fieldId":""}', "unknown_field"],
    ["一覧に無い番号", '{"fieldId":"A-99"}', "unknown_field"],
    ["前後の空白（削らない）", '{"fieldId":" A-07"}', "unknown_field"],
    ["小文字（正規化しない）", '{"fieldId":"a-07"}', "unknown_field"],
  ])("%s は %s", (_, text, reason) => {
    expect(parseAssignmentBody(text, KNOWN)).toEqual({ ok: false, reason });
  });

  it("上限を超える長さは、JSON として読む前に too_long", () => {
    const text = `{"fieldId":"A-07","x":"${"a".repeat(ASSIGNMENT_BODY_MAX_BYTES)}"}`;
    expect(parseAssignmentBody(text, KNOWN)).toEqual({ ok: false, reason: "too_long" });
  });

  it("上限ちょうどまでは読む", () => {
    const pad = ASSIGNMENT_BODY_MAX_BYTES - '{"fieldId":"A-07"}'.length;
    const text = `{"fieldId":"A-07"}${" ".repeat(pad)}`;
    expect(text.length).toBe(ASSIGNMENT_BODY_MAX_BYTES);
    expect(parseAssignmentBody(text, KNOWN)).toEqual({ ok: true, fieldId: "A-07" });
  });
});

describe("assignmentBodyStatus（理由 → HTTP の状態）", () => {
  it.each<[AssignmentBodyReason, number]>([
    ["too_long", 413],
    ["not_json", 400],
    ["not_object", 400],
    ["unknown_key", 400],
    ["missing_field_id", 400],
    ["bad_field_id", 422],
    ["unknown_field", 422],
  ])("%s は %i", (reason, status) => {
    expect(assignmentBodyStatus(reason)).toBe(status);
  });
});
