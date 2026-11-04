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
  ])("%s → %s", (ms, season) => {
    expect(handoverSeason(ms)).toBe(season);
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
          records: [{ kind: "status", id: "3", text: "t", actorDevice: "dev-secret" }],
          blocks: [{ text: "b", cites: [{ start: 0, end: 1, citedText: "c", document_title: "x" }], extra: 1 }],
          prompt: "秘密の指示",
        },
      ),
    );
    expect(note.records).toStrictEqual([{ kind: "status", id: "3", text: "t" }]);
    expect(note.blocks).toStrictEqual([{ text: "b", cites: [{ start: 0, end: 1, citedText: "c" }] }]);
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
