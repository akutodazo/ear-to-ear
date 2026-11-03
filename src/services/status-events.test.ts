import { describe, expect, it } from "vitest";
import { parseStatusEventId, statusEventFromRow, type StatusEventRow } from "./status-events";

describe("parseStatusEventId（DELETE /api/status-events/:id の :id）", () => {
  it.each([
    ["1", 1],
    ["42", 42],
    ["1000", 1000],
    ["9007199254740991", Number.MAX_SAFE_INTEGER],
  ])("%s は %d", (raw, expected) => {
    expect(parseStatusEventId(raw)).toBe(expected);
  });

  it.each([
    ["空", ""],
    ["0", "0"],
    ["負", "-1"],
    ["先頭の 0", "01"],
    ["符号", "+1"],
    ["小数", "1.5"],
    ["小数点だけ付く", "1."],
    ["指数", "1e3"],
    ["16 進", "0x10"],
    ["前の空白", " 1"],
    ["後ろの空白", "1 "],
    ["全角の数字", "１"],
    ["文字", "abc"],
    ["数と文字", "12abc"],
    ["安全な整数を超える", "9007199254740992"],
    ["とても大きい", "9".repeat(400)],
    ["Infinity", "Infinity"],
    ["NaN", "NaN"],
  ])("%s（%s）は null", (_label, raw) => {
    expect(parseStatusEventId(raw)).toBeNull();
  });
});

function row(overrides: Partial<StatusEventRow> = {}): StatusEventRow {
  return {
    id: 7,
    field_id: "A-03",
    status: "ready",
    reasons: '["ear_color","ja_stop_moisture"]',
    note: "南側が先に黄色い",
    ref_photo_ids: '["p1","p2"]',
    actor_device: "dev-member",
    at: "2026-07-21T01:00:00.000Z",
    revoked_at: null,
    ...overrides,
  };
}

describe("statusEventFromRow", () => {
  it("1 行を StatusEvent に写す（JSON の列は配列に戻す）", () => {
    expect(statusEventFromRow(row())).toStrictEqual({
      id: 7,
      fieldId: "A-03",
      status: "ready",
      reasons: ["ear_color", "ja_stop_moisture"],
      note: "南側が先に黄色い",
      refPhotoIds: ["p1", "p2"],
      actorDevice: "dev-member",
      at: "2026-07-21T01:00:00.000Z",
      revokedAt: null,
    });
  });

  it("空の配列・メモなし・取り消し済み・収穫済みもそのまま写す", () => {
    expect(
      statusEventFromRow(
        row({ status: "done", reasons: "[]", note: null, ref_photo_ids: "[]", revoked_at: "2026-07-22T00:00:00.000Z" }),
      ),
    ).toStrictEqual({
      id: 7,
      fieldId: "A-03",
      status: "done",
      reasons: [],
      note: null,
      refPhotoIds: [],
      actorDevice: "dev-member",
      at: "2026-07-21T01:00:00.000Z",
      revokedAt: "2026-07-22T00:00:00.000Z",
    });
  });

  it("返すのは StatusEvent の 9 項目だけ", () => {
    expect(Object.keys(statusEventFromRow(row())).sort()).toEqual(
      ["actorDevice", "at", "fieldId", "id", "note", "reasons", "refPhotoIds", "revokedAt", "status"],
    );
  });

  it.each([
    ["JSON でない", "secret-not-json"],
    ["配列でない", '{"secret":1}'],
    ["文字列でない要素", '["ok",1]'],
    ["null", "null"],
    ["文字列", '"secret"'],
  ])("reasons が %s なら reasons の名前の例外で、中身を入れない", (_label, text) => {
    expect(() => statusEventFromRow(row({ reasons: text }))).toThrow(/reasons/);
    expect(() => statusEventFromRow(row({ reasons: text }))).not.toThrow(/secret/);
  });

  it.each([
    ["JSON でない", "secret-not-json"],
    ["配列でない", '{"secret":1}'],
    ["文字列でない要素", '["p1",null]'],
    ["null", "null"],
  ])("ref_photo_ids が %s なら ref_photo_ids の名前の例外で、中身を入れない", (_label, text) => {
    expect(() => statusEventFromRow(row({ ref_photo_ids: text }))).toThrow(/ref_photo_ids/);
    expect(() => statusEventFromRow(row({ ref_photo_ids: text }))).not.toThrow(/secret/);
  });

  it("配列は行の文字列と別のもの（返したものを変えても次の結果に響かない）", () => {
    const r = row();
    const first = statusEventFromRow(r);
    first.reasons.push("x");
    expect(statusEventFromRow(r).reasons).toEqual(["ear_color", "ja_stop_moisture"]);
  });
});
