import { describe, expect, it } from "vitest";
import type { HandoverNote } from "@/types";
import { HANDOVER_NOTE_COLUMNS, handoverNoteFromRow, handoverSeason, type HandoverNoteRow } from "./handover-note";

const NOTE_BODY = {
  records: [
    { kind: "photo", id: "p-1", text: "[写真] 2026-07-20 撮影。判断 3 の根拠。" },
    { kind: "status", id: "3", text: "[判断 3] 2026-07-21 収穫可能。理由: 穂の色。" },
  ],
  blocks: [
    { text: "A-06 は ", cites: [] },
    { text: "7 月 21 日に収穫可能と判断された", cites: [{ start: 0, end: 2, citedText: "[写真] …" }] },
  ],
};

function row(change: Partial<HandoverNoteRow> = {}, body: unknown = NOTE_BODY): HandoverNoteRow {
  return {
    field_id: "A-06",
    season: "2026",
    body: JSON.stringify(body),
    model: "claude-sonnet-5-5",
    created_at: "2026-11-05T01:00:00.000Z",
    ...change,
  };
}

/** NOTE_BODY を元に一部だけ変えた body */
function bodyWith(change: Record<string, unknown>): unknown {
  return { ...NOTE_BODY, ...change };
}

describe("HANDOVER_NOTE_COLUMNS（T29）", () => {
  it("表の 5 つの列", () => {
    expect([...HANDOVER_NOTE_COLUMNS]).toStrictEqual(["field_id", "season", "body", "model", "created_at"]);
  });
});

describe("handoverSeason: 日本時間の年（T29）", () => {
  it.each([
    [Date.parse("2026-07-21T01:00:00.000Z"), "2026"],
    [Date.parse("2025-12-31T14:59:59.999Z"), "2025"],
    [Date.parse("2025-12-31T15:00:00.000Z"), "2026"],
    [Date.parse("2026-12-31T15:00:00.000Z"), "2027"],
    // 攻撃役（T29 の 1 回目）: 2 つの年の境目だけで場合分けしても通った
    [Date.parse("2024-06-01T00:00:00.000Z"), "2024"],
    [Date.parse("2028-02-29T14:59:59.999Z"), "2028"],
    [Date.parse("2031-03-01T00:00:00.000Z"), "2031"],
    [Date.parse("2029-12-31T14:59:59.999Z"), "2029"],
  ])("%s → %s", (ms, season) => {
    expect(handoverSeason(ms)).toBe(season);
  });
});

// 攻撃役（T29 の 2 回目）: 2024〜2031 年の元日の表を持っても通った
describe("handoverSeason: どの年でも元日の境で変わる（T29）", () => {
  it.each([1971, 1999, 2000, 2024, 2040, 2063, 2099, 2100])("%s 年", (year) => {
    const newYear = Date.UTC(year, 0, 1) - 9 * 3600_000;
    expect(handoverSeason(newYear - 1)).toBe(String(year - 1));
    expect(handoverSeason(newYear)).toBe(String(year));
    expect(handoverSeason(Date.UTC(year, 6, 15))).toBe(String(year));
  });
});

describe("handoverNoteFromRow: 行を HandoverNote に戻す（T29）", () => {
  it("列と body の records・blocks を写す", () => {
    const expected: HandoverNote = {
      fieldId: "A-06",
      season: "2026",
      records: NOTE_BODY.records as HandoverNote["records"],
      blocks: NOTE_BODY.blocks,
      model: "claude-sonnet-5-5",
      createdAt: "2026-11-05T01:00:00.000Z",
    };
    expect(handoverNoteFromRow(row())).toStrictEqual(expected);
  });

  // 攻撃役（T29 の 1 回目）: 値が 1 組しかなく、固定値に近い写しでも通った
  it("列の値は行から写す（別の圃場・シーズン・モデル・時刻）", () => {
    const note = handoverNoteFromRow(
      row({ field_id: "B-03", season: "2031", model: "m-x", created_at: "2031-08-01T00:00:00.000Z" }, {
        records: [{ kind: "status", id: "77", text: "t" }],
        blocks: [{ text: "b", cites: [{ start: 0, end: 1, citedText: "c" }] }],
      }),
    );
    expect([note.fieldId, note.season, note.model, note.createdAt]).toStrictEqual(["B-03", "2031", "m-x", "2031-08-01T00:00:00.000Z"]);
    expect(note.records).toStrictEqual([{ kind: "status", id: "77", text: "t" }]);
  });

  it("records・blocks・cites が空でも戻せる", () => {
    const note = handoverNoteFromRow(row({}, { records: [], blocks: [] }));
    expect(note.records).toStrictEqual([]);
    expect(note.blocks).toStrictEqual([]);
  });

  it("body の余分な項目・要素の余分な項目は写さない", () => {
    const note = handoverNoteFromRow(
      row(
        {},
        {
          records: [
            { kind: "status", id: "3", text: "t" },
            { kind: "photo", id: "p", text: "u", actorDevice: "dev-secret" },
          ],
          blocks: [
            { text: "a", cites: [] },
            { text: "b", cites: [{ start: 0, end: 1, citedText: "c" }, { start: 1, end: 2, citedText: "d", document_title: "x" }], extra: 1 },
          ],
          prompt: "秘密の指示",
        },
      ),
    );
    expect(note.records).toStrictEqual([
      { kind: "status", id: "3", text: "t" },
      { kind: "photo", id: "p", text: "u" },
    ]);
    expect(note.blocks).toStrictEqual([
      { text: "a", cites: [] },
      { text: "b", cites: [{ start: 0, end: 1, citedText: "c" }, { start: 1, end: 2, citedText: "d" }] },
    ]);
    expect(JSON.stringify(note)).not.toMatch(/dev-secret|秘密の指示|document_title|extra/);
  });
});

describe("handoverNoteFromRow: 壊れた行は例外（中身はメッセージに入れない）（T29）", () => {
  it.each([
    ["body が JSON でない", row({ body: "{records" })],
    ["body が配列", row({}, [])],
    ["body が null", row({}, null)],
    ["records が無い", row({}, { blocks: [] })],
    ["blocks が無い", row({}, { records: [] })],
    ["records が配列でない", row({}, bodyWith({ records: {} }))],
    ["blocks が配列でない", row({}, bodyWith({ blocks: "x" }))],
    ["record の kind が違う", row({}, bodyWith({ records: [{ kind: "memo", id: "1", text: "t" }] }))],
    ["record の id が文字列でない", row({}, bodyWith({ records: [{ kind: "status", id: 3, text: "t" }] }))],
    ["record の text が無い", row({}, bodyWith({ records: [{ kind: "status", id: "3" }] }))],
    ["record が null", row({}, bodyWith({ records: [null] }))],
    ["block の text が文字列でない", row({}, bodyWith({ blocks: [{ text: 1, cites: [] }] }))],
    ["block の cites が無い", row({}, bodyWith({ blocks: [{ text: "b" }] }))],
    ["cite の citedText が無い", row({}, bodyWith({ blocks: [{ text: "b", cites: [{ start: 0, end: 1 }] }] }))],
    ["cite の start が整数でない", row({}, bodyWith({ blocks: [{ text: "b", cites: [{ start: 0.5, end: 1, citedText: "c" }] }] }))],
    ["cite の end が records の数を超える", row({}, bodyWith({ blocks: [{ text: "b", cites: [{ start: 0, end: 3, citedText: "c" }] }] }))],
    ["cite の start が負", row({}, bodyWith({ blocks: [{ text: "b", cites: [{ start: -1, end: 1, citedText: "c" }] }] }))],
    ["cite の start が end 以上", row({}, bodyWith({ blocks: [{ text: "b", cites: [{ start: 1, end: 1, citedText: "c" }] }] }))],
    ["列の model が文字列でない", row({ model: 5 as unknown as string })],
    ["列の created_at が null", row({ created_at: null as unknown as string })],
    ["列の season が文字列でない", row({ season: 2026 as unknown as string })],
    // 攻撃役（T29 の 1 回目）: field_id の型・end が整数かを見なくても通った
    ["列の field_id が null", row({ field_id: null as unknown as string })],
    ["列の field_id が数", row({ field_id: 6 as unknown as string })],
    ["列の body が null", row({ body: null as unknown as string })],
    ["cite の end が整数でない", row({}, bodyWith({ blocks: [{ text: "b", cites: [{ start: 0, end: 1.5, citedText: "c" }] }] }))],
    ["cite の end が NaN", row({}, bodyWith({ blocks: [{ text: "b", cites: [{ start: 0, end: Number.NaN, citedText: "c" }] }] }))],
    // 攻撃役（T29 の 2 回目）: テストに出る値（memo・数・undefined）だけを弾いても通った
    ["record の kind が無い", row({}, bodyWith({ records: [{ id: "1", text: "t" }] }))],
    ["record の kind が数", row({}, bodyWith({ records: [{ kind: 1, id: "1", text: "t" }] }))],
    ["record の kind が空", row({}, bodyWith({ records: [{ kind: "", id: "1", text: "t" }] }))],
    ["record の kind が大文字", row({}, bodyWith({ records: [{ kind: "Photo", id: "1", text: "t" }] }))],
    ["record の kind が別の語", row({}, bodyWith({ records: [{ kind: "assignment", id: "1", text: "t" }] }))],
    ["record の id が null", row({}, bodyWith({ records: [{ kind: "status", id: null, text: "t" }] }))],
    ["record の id が真偽値", row({}, bodyWith({ records: [{ kind: "status", id: true, text: "t" }] }))],
    ["record の id がオブジェクト", row({}, bodyWith({ records: [{ kind: "status", id: {}, text: "t" }] }))],
    ["record の text が null", row({}, bodyWith({ records: [{ kind: "status", id: "1", text: null }] }))],
    ["record の text がオブジェクト", row({}, bodyWith({ records: [{ kind: "status", id: "1", text: {} }] }))],
    ["record が文字列", row({}, bodyWith({ records: ["[判断 1]"] }))],
    ["block の text が null", row({}, bodyWith({ blocks: [{ text: null, cites: [] }] }))],
    ["block の text が配列", row({}, bodyWith({ blocks: [{ text: ["b"], cites: [] }] }))],
    ["block が null", row({}, bodyWith({ blocks: [null] }))],
    ["block の cites がオブジェクト", row({}, bodyWith({ blocks: [{ text: "b", cites: {} }] }))],
    ["block の cites が文字列", row({}, bodyWith({ blocks: [{ text: "b", cites: "x" }] }))],
    ["cite が null", row({}, bodyWith({ blocks: [{ text: "b", cites: [null] }] }))],
    ["cite が文字列", row({}, bodyWith({ blocks: [{ text: "b", cites: ["0-1"] }] }))],
    ["cite の citedText が null", row({}, bodyWith({ blocks: [{ text: "b", cites: [{ start: 0, end: 1, citedText: null }] }] }))],
    ["cite の citedText が数", row({}, bodyWith({ blocks: [{ text: "b", cites: [{ start: 0, end: 1, citedText: 1 }] }] }))],
    ["body が数", row({}, 5)],
    ["body が文字列", row({}, "records")],
    ["cite の start が文字列", row({}, bodyWith({ blocks: [{ text: "b", cites: [{ start: "0", end: 1, citedText: "c" }] }] }))],
  ])("%s", (_name, bad) => {
    expect(() => handoverNoteFromRow(bad)).toThrow(/handover_notes/);
  });

  it("2 つ目以降の要素だけが壊れていても例外", () => {
    const records = [...NOTE_BODY.records, { kind: "status", id: "9" }];
    expect(() => handoverNoteFromRow(row({}, bodyWith({ records })))).toThrow(/handover_notes/);
    const blocks = [...NOTE_BODY.blocks, { text: "b", cites: [{ start: 0, end: 1, citedText: "c" }, { start: 0 }] }];
    expect(() => handoverNoteFromRow(row({}, bodyWith({ blocks })))).toThrow(/handover_notes/);
  });

  it("例外のメッセージに body の中身を入れない", () => {
    const secret = "dev-secret-9f3";
    try {
      handoverNoteFromRow(row({}, bodyWith({ records: [{ kind: "memo", id: secret, text: secret }] })));
      expect.unreachable("例外にならなかった");
    } catch (error) {
      expect(String(error)).not.toContain(secret);
    }
  });
});
