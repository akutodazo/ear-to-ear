import { describe, expect, it } from "vitest";
import type { HandoverNote, HandoverRecord, StatusEvent, UploadedPhoto } from "@/types";
import { buildHandoverRecords } from "./handover-document";
import { NO_SOURCE_LABEL, handoverSentences, sourceLabel, statusAnchorId } from "./handover-view";

function event(id: number, at: string, change: Partial<StatusEvent> = {}): StatusEvent {
  return {
    id,
    fieldId: "A-06",
    status: "ready",
    reasons: [],
    note: null,
    refPhotoIds: [],
    actorDevice: "d1",
    at,
    revokedAt: null,
    ...change,
  };
}

function photo(id: string, takenAt: string | null, change: Partial<UploadedPhoto> = {}): UploadedPhoto {
  return {
    id,
    fieldId: "A-06",
    chosenFieldId: null,
    state: "confirmed",
    candidateFieldIds: ["A-06"],
    takenAt,
    takenAtSource: takenAt === null ? "none" : "xmp",
    width: 1601,
    height: 1203,
    uploadedAt: "2026-07-25T03:00:00.000Z",
    uploaderDevice: "u1",
    ...change,
  };
}

/** T27 で作った本物の書き方の記録だけを持つ（書き方が変わったらここで気づく） */
function realRecord(input: { event?: StatusEvent; photo?: UploadedPhoto }): HandoverRecord {
  const records = buildHandoverRecords(
    "A-06",
    "2026",
    input.event ? [input.event] : [],
    input.photo ? [input.photo] : [],
  );
  expect(records).toHaveLength(1);
  return records[0];
}

const status7 = realRecord({ event: event(7, "2026-07-21T01:00:00.000Z", { reasons: ["ear_color"] }) });
const status12 = realRecord({ event: event(12, "2026-07-05T01:00:00.000Z") });
const photoA = realRecord({ photo: photo("aaaaaaaa-0000-4000-8000-000000000001", "2026-07-20") });
const photoB = realRecord({ photo: photo("bbbbbbbb-0000-4000-8000-000000000002", "2026-08-03") });

function note(records: HandoverRecord[], blocks: HandoverNote["blocks"]): HandoverNote {
  return { fieldId: "A-06", season: "2026", records, blocks, model: "claude-sonnet-5-5", createdAt: "2026-08-04T00:00:00.000Z" };
}

const cite = (start: number, end: number, citedText = "引用") => ({ start, end, citedText });

describe("statusAnchorId", () => {
  it("判断の番号から決まった id を作る（番号ごとに違う）", () => {
    expect(statusAnchorId("7")).toBe("status-event-7");
    expect(statusAnchorId("12")).toBe("status-event-12");
  });
});

describe("sourceLabel（T27 の書き方を読む）", () => {
  it("判断は「判断 月/日」（日本時間の日付、0 は付けない）", () => {
    expect(sourceLabel(status7)).toBe("判断 7/21");
    expect(sourceLabel(status12)).toBe("判断 7/5");
  });

  it("日本時間で日付が変わる時刻は、日本時間の日付", () => {
    expect(sourceLabel(realRecord({ event: event(3, "2026-07-20T15:30:00.000Z") }))).toBe("判断 7/21");
  });

  it("取り消した判断は「（取り消し）」を付ける", () => {
    const revoked = realRecord({
      event: event(9, "2026-07-21T01:00:00.000Z", { revokedAt: "2026-07-22T00:00:00.000Z" }),
    });
    expect(sourceLabel(revoked)).toBe("判断 7/21（取り消し）");
  });

  it("メモの中に「取り消し」と書いてあるだけなら付けない", () => {
    const withNote = realRecord({
      event: event(10, "2026-07-21T01:00:00.000Z", { note: "雨なら取り消しにする（7/22 に取り消し）" }),
    });
    expect(sourceLabel(withNote)).toBe("判断 7/21");
  });

  it("取り消しの印は T27 の書き方（文末の「（YYYY-MM-DD に取り消し）」）だけ", () => {
    expect(sourceLabel({ kind: "status", id: "1", text: "[判断 1] 2026-07-21 収穫可能。メモ: 雨なら 7/22 に取り消し）" })).toBe(
      "判断 7/21",
    );
    expect(sourceLabel({ kind: "status", id: "1", text: "[判断 1] 2026-07-21 収穫可能。（2026-07-22 に取り消し）" })).toBe(
      "判断 7/21（取り消し）",
    );
  });

  it("写真は「写真 月/日」（撮影日）、撮影日が無ければ「写真（撮影日不明）」", () => {
    expect(sourceLabel(photoA)).toBe("写真 7/20");
    expect(sourceLabel(photoB)).toBe("写真 8/3");
    expect(sourceLabel(realRecord({ photo: photo("c", null) }))).toBe("写真（撮影日不明）");
  });

  it("読めない書き方は、種類の名前だけ", () => {
    expect(sourceLabel({ kind: "status", id: "1", text: "別の書き方" })).toBe("判断");
    expect(sourceLabel({ kind: "photo", id: "p", text: "" })).toBe("写真");
    expect(sourceLabel({ kind: "status", id: "1", text: "[写真] 2026-07-20 撮影。" })).toBe("判断");
    expect(sourceLabel({ kind: "photo", id: "p", text: "[判断 1] 2026-07-21 収穫可能。" })).toBe("写真");
  });

  it("文の途中の日付は読まない（先頭の書き方だけ）", () => {
    expect(sourceLabel({ kind: "status", id: "1", text: "メモ [判断 1] 2026-07-21 収穫可能。" })).toBe("判断");
    expect(sourceLabel({ kind: "photo", id: "p", text: " [写真] 2026-07-20 撮影。" })).toBe("写真");
  });
});

describe("handoverSentences", () => {
  it("ブロック 1 つが 1 文。順はそのまま、文は変えない", () => {
    const result = handoverSentences(
      note([status7], [
        { text: "7/21 に収穫可能と判断した。", cites: [cite(0, 1)] },
        { text: " 理由は穂の色。\n", cites: [cite(0, 1)] },
      ]),
    );
    expect(result.map((s) => s.text)).toStrictEqual(["7/21 に収穫可能と判断した。", " 理由は穂の色。\n"]);
  });

  it("引用の範囲の記録を根拠の印にする（end は含まない）", () => {
    const records = [photoA, status7, status12, photoB];
    const [sentence] = handoverSentences(note(records, [{ text: "文", cites: [cite(1, 3, "収穫可能")] }]));
    expect(sentence.uncited).toBe(false);
    expect(sentence.sources).toStrictEqual([
      { kind: "status", id: "7", label: "判断 7/21", href: "#status-event-7", citedText: "収穫可能" },
      { kind: "status", id: "12", label: "判断 7/5", href: "#status-event-12", citedText: "収穫可能" },
    ]);
  });

  it("写真の戻り先は画像（id を符号化）", () => {
    const odd: HandoverRecord = { kind: "photo", id: "a/b?c", text: "[写真] 2026-07-20 撮影。" };
    const [a, b] = handoverSentences(
      note([photoA, odd], [
        { text: "写真", cites: [cite(0, 1)] },
        { text: "写真", cites: [cite(1, 2)] },
      ]),
    );
    expect(a.sources[0].href).toBe("/api/photo-files/aaaaaaaa-0000-4000-8000-000000000001");
    expect(b.sources[0].href).toBe("/api/photo-files/a%2Fb%3Fc");
  });

  it("同じ記録は 1 回だけ、最初に引用された順。引用の部分は最初のもの", () => {
    const [sentence] = handoverSentences(
      note([photoA, status7, status12], [
        { text: "文", cites: [cite(2, 3, "一"), cite(1, 3, "二"), cite(0, 1, "三"), cite(2, 3, "四")] },
      ]),
    );
    expect(sentence.sources.map((s) => [s.id, s.citedText])).toStrictEqual([
      ["12", "一"],
      ["7", "二"],
      [photoA.id, "三"],
    ]);
  });

  it("引用が無い文は uncited、印は空", () => {
    const [sentence] = handoverSentences(note([status7], [{ text: "来年も穂を見る。", cites: [] }]));
    expect(sentence).toStrictEqual({ text: "来年も穂を見る。", sources: [], uncited: true });
    expect(NO_SOURCE_LABEL).toBe("根拠なし");
  });

  it("範囲の外の番号は飛ばし、残りが無ければ uncited", () => {
    const records = [status7, status12];
    const [partly, none] = handoverSentences(
      note(records, [
        { text: "一部", cites: [cite(1, 4)] },
        { text: "外", cites: [cite(2, 3), cite(-1, 0), cite(5, 9)] },
      ]),
    );
    expect(partly.sources.map((s) => s.id)).toStrictEqual(["12"]);
    expect(partly.uncited).toBe(false);
    expect(none).toStrictEqual({ text: "外", sources: [], uncited: true });
  });

  it("負の start は 0 からの範囲として扱わない（-1〜1 は 0 だけ）", () => {
    const [sentence] = handoverSentences(note([status7, status12], [{ text: "文", cites: [cite(-1, 1)] }]));
    expect(sentence.sources.map((s) => s.id)).toStrictEqual(["7"]);
  });

  it("start が end 以上・数でない・整数でない番号の引用は無いものとする", () => {
    const records = [status7, status12];
    const bad = [
      cite(1, 1),
      cite(2, 1),
      { start: "0", end: 1, citedText: "x" },
      { start: 0, end: "1", citedText: "x" },
      { start: 0.5, end: 1.5, citedText: "x" },
      { start: Number.NaN, end: 1, citedText: "x" },
      { start: 0, end: Number.POSITIVE_INFINITY, citedText: "x" },
    ] as unknown as HandoverNote["blocks"][number]["cites"];
    for (const c of bad) {
      const [sentence] = handoverSentences(note(records, [{ text: "文", cites: [c] }]));
      expect(sentence).toStrictEqual({ text: "文", sources: [], uncited: true });
    }
  });

  it("大きな範囲でも記録の数までしか見ない", () => {
    const [sentence] = handoverSentences(
      note([status7], [{ text: "文", cites: [cite(0, Number.MAX_SAFE_INTEGER)] }]),
    );
    expect(sentence.sources.map((s) => s.id)).toStrictEqual(["7"]);
  });

  it("引用の部分が文字列でなければ空の文字列", () => {
    const c = { start: 0, end: 1, citedText: 5 } as unknown as HandoverNote["blocks"][number]["cites"][number];
    const [sentence] = handoverSentences(note([status7], [{ text: "文", cites: [c] }]));
    expect(sentence.sources[0].citedText).toBe("");
  });

  it("中身が空白だけのブロックは出さない（引用があっても）", () => {
    const result = handoverSentences(
      note([status7], [
        { text: "", cites: [] },
        { text: " \n\t　", cites: [cite(0, 1)] },
        { text: "残る", cites: [] },
      ]),
    );
    expect(result.map((s) => s.text)).toStrictEqual(["残る"]);
  });

  it("ブロックが無ければ空", () => {
    expect(handoverSentences(note([status7], []))).toStrictEqual([]);
  });

  it("文ごとに独立（前の文の印が次の文に混ざらない）", () => {
    const [a, b] = handoverSentences(
      note([status7, status12], [
        { text: "一", cites: [cite(0, 1)] },
        { text: "二", cites: [cite(1, 2)] },
      ]),
    );
    expect(a.sources.map((s) => s.id)).toStrictEqual(["7"]);
    expect(b.sources.map((s) => s.id)).toStrictEqual(["12"]);
  });

  it("同じ記録を別の文が引用したら、どちらの文にも印が付く（文をまたいで重複を除かない）", () => {
    const [a, b] = handoverSentences(
      note([status7, status12], [
        { text: "一", cites: [cite(0, 2, "一の引用")] },
        { text: "二", cites: [cite(0, 1, "二の引用")] },
      ]),
    );
    expect(a.sources.map((s) => s.id)).toStrictEqual(["7", "12"]);
    expect(b.sources.map((s) => [s.id, s.citedText])).toStrictEqual([["7", "二の引用"]]);
  });

  it("メモを変えない", () => {
    const n = note([status7], [{ text: "文", cites: [cite(0, 1)] }]);
    const copy = structuredClone(n);
    handoverSentences(n);
    expect(n).toStrictEqual(copy);
  });
});
