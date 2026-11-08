import { describe, expect, it } from "vitest";
import { compareStageNote, sameDayEmptyNote } from "./compare-note";

// 見比べるの「同じ日に撮った別の畑と」で、相手の写真が無いときの一文（11-06 地図の精査 #5）。
// 目安の畑と見比べに来たのに、目安の畑の名前が出ないと、何と比べたかったのかを見失う
describe("sameDayEmptyNote（同じ日に撮った別の畑が無いとき）", () => {
  it("目安の畑に確定した写真が 1 枚も無ければ、目安の畑の番号を出してそう言う", () => {
    expect(sameDayEmptyNote({ dateLabel: "7/21", selfId: "A-06", benchmarkId: "A-07", benchmarkHasPhotos: false })).toBe(
      "目安の畑 A-07 には、まだ確定した写真がありません",
    );
  });

  it("目安の畑に写真はあるがその日には無ければ、日と目安の畑の番号を出す", () => {
    expect(sameDayEmptyNote({ dateLabel: "7/21", selfId: "A-06", benchmarkId: "A-07", benchmarkHasPhotos: true })).toBe(
      "7/21 に撮った目安の畑 A-07 の写真はありません（同じ日に撮った写真どうしで比べます）",
    );
  });

  it("目安が無い・自分が目安のときは、今までどおり別の畑の写真が無いと言う", () => {
    expect(sameDayEmptyNote({ dateLabel: "7/21", selfId: "A-07", benchmarkId: "A-07", benchmarkHasPhotos: true })).toBe("7/21 に撮った別の畑の写真はありません");
    expect(sameDayEmptyNote({ dateLabel: "7/21", selfId: "A-06", benchmarkId: null, benchmarkHasPhotos: false })).toBe("7/21 に撮った別の畑の写真はありません");
  });

  it("日が分からなければ「この日」と言う", () => {
    expect(sameDayEmptyNote({ dateLabel: null, selfId: "A-07", benchmarkId: null, benchmarkHasPhotos: false })).toBe("この日 に撮った別の畑の写真はありません");
  });
});

// 比較の段に写真を並べられないときの一文（field-client から移す。#240）。上から順に先に当てはまったもの
describe("compareStageNote（比較の段の空の文）", () => {
  const base = {
    loading: false,
    ownFailed: false,
    ownDayCount: 2,
    hasPartner: false,
    mode: "same-day" as const,
    date: "2026-07-19",
    selfId: "A-03",
    benchmarkId: "A-04",
    benchmarkHasPhotos: true,
  };

  it("読み込み中がいちばん先（失敗や写真なしより先）", () => {
    expect(compareStageNote({ ...base, loading: true, ownFailed: true, ownDayCount: 0 })).toBe("写真を読み込んでいます");
  });

  it("この畑の写真を読めなかった", () => {
    expect(compareStageNote({ ...base, ownFailed: true, ownDayCount: 0 })).toBe("写真を読み込めませんでした");
  });

  it("この畑に写真が無い", () => {
    expect(compareStageNote({ ...base, ownDayCount: 0 })).toBe("この畑の写真はまだありません");
  });

  it("並べられるなら null（文を出さない）", () => {
    expect(compareStageNote({ ...base, hasPartner: true })).toBeNull();
    expect(compareStageNote({ ...base, mode: "same-field", hasPartner: true })).toBeNull();
  });

  it("同じ日の相手が無いときは、日付と目安の畑を言う（sameDayEmptyNote と同じ文）", () => {
    expect(compareStageNote(base)).toBe(
      sameDayEmptyNote({ dateLabel: "7/19", selfId: "A-03", benchmarkId: "A-04", benchmarkHasPhotos: true }),
    );
    expect(compareStageNote({ ...base, benchmarkHasPhotos: false })).toBe("目安の畑 A-04 には、まだ確定した写真がありません");
  });

  it("日付が無ければ「この日」", () => {
    expect(compareStageNote({ ...base, date: null, benchmarkId: null })).toBe("この日 に撮った別の畑の写真はありません");
  });

  it("前の日と で前の日が無い", () => {
    expect(compareStageNote({ ...base, mode: "same-field" })).toBe("前の日の写真はありません");
  });
});
