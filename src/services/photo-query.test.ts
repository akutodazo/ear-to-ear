import { describe, expect, it } from "vitest";
import { RECENT_LIMIT_DEFAULT, RECENT_LIMIT_MAX } from "@/config";
import { parseFieldIdQuery, parseRecentLimit, PHOTO_LIST_COLUMNS, photoFromRow, type PhotoListRow } from "./photo-query";

const ROW: PhotoListRow = {
  id: "p1",
  field_id: "A-03",
  chosen_field_id: "A-05",
  state: "confirmed",
  candidate_field_ids: '["A-03","A-05"]',
  taken_at: "2026-07-24",
  taken_at_source: "exif",
  width: 1600,
  height: 1200,
  uploaded_at: "2026-11-03T08:34:23.249Z",
  uploader_device: "dev-1",
};

describe("parseRecentLimit", () => {
  it("既定は 50、上限は 200（config）", () => {
    expect(RECENT_LIMIT_DEFAULT).toBe(50);
    expect(RECENT_LIMIT_MAX).toBe(200);
  });

  it.each([
    ["無い", null],
    ["空", ""],
    ["0", "0"],
    ["負", "-1"],
    ["文字", "abc"],
    ["小数", "1.5"],
    ["指数", "5e1"],
    ["+ 付き", "+50"],
    ["前に空白", " 50"],
    ["16 進", "0x10"],
    ["全角", "５０"],
    ["後ろに文字", "50abc"],
    ["先頭の 0", "050"],
    // 攻撃役の指摘: 後ろの空白・改行や、ほかの数字の書き方も既定に落とす
    ["後ろに空白", "50 "],
    ["後ろに改行", "50\n"],
    ["区切り", "5_0"],
    ["アラビア・インド数字", "٥٠"],
  ])("%s（%s）は既定の 50", (_name, raw) => {
    expect(parseRecentLimit(raw)).toBe(50);
  });

  it.each([
    ["1", 1],
    ["50", 50],
    ["200", 200],
  ])("%s はそのまま %i", (raw, n) => {
    expect(parseRecentLimit(raw)).toBe(n);
  });

  it.each(["201", "100000", "99999999999999999999"])("%s は上限の 200 に丸める", (raw) => {
    expect(parseRecentLimit(raw)).toBe(200);
  });

  it("引数の fallback と max に従う", () => {
    expect(parseRecentLimit("abc", 7, 9)).toBe(7);
    expect(parseRecentLimit("10", 7, 9)).toBe(9);
    expect(parseRecentLimit("8", 7, 9)).toBe(8);
  });
});

describe("PHOTO_LIST_COLUMNS", () => {
  it("返す 11 列ちょうど", () => {
    expect([...PHOTO_LIST_COLUMNS]).toEqual([
      "id",
      "field_id",
      "chosen_field_id",
      "state",
      "candidate_field_ids",
      "taken_at",
      "taken_at_source",
      "width",
      "height",
      "uploaded_at",
      "uploader_device",
    ]);
  });

  it("写真のハッシュ・R2 のキー・大きさ・更新時刻は入れない（docs/privacy.md）", () => {
    for (const hidden of ["content_hash", "r2_key", "bytes", "updated_at"]) {
      expect(PHOTO_LIST_COLUMNS).not.toContain(hidden);
    }
  });

  it("座標・距離らしい列は無い（K6）", () => {
    for (const column of PHOTO_LIST_COLUMNS) {
      expect(column).not.toMatch(/lat|lng|lon|gps|dist|coord|position|meter/i);
    }
  });
});

describe("photoFromRow", () => {
  it("UploadedPhoto の 11 項目を、この順で返す", () => {
    const photo = photoFromRow(ROW);
    expect(photo).toStrictEqual({
      id: "p1",
      fieldId: "A-03",
      chosenFieldId: "A-05",
      state: "confirmed",
      candidateFieldIds: ["A-03", "A-05"],
      takenAt: "2026-07-24",
      takenAtSource: "exif",
      width: 1600,
      height: 1200,
      uploadedAt: "2026-11-03T08:34:23.249Z",
      uploaderDevice: "dev-1",
    });
    expect(Object.keys(photo)).toEqual([
      "id",
      "fieldId",
      "chosenFieldId",
      "state",
      "candidateFieldIds",
      "takenAt",
      "takenAtSource",
      "width",
      "height",
      "uploadedAt",
      "uploaderDevice",
    ]);
  });

  it("null の列はそのまま、候補が空なら []", () => {
    const photo = photoFromRow({
      ...ROW,
      field_id: null,
      chosen_field_id: null,
      state: "unconfirmed",
      candidate_field_ids: "[]",
      taken_at: null,
      taken_at_source: "none",
    });
    expect(photo).toMatchObject({
      fieldId: null,
      chosenFieldId: null,
      state: "unconfirmed",
      candidateFieldIds: [],
      takenAt: null,
      takenAtSource: "none",
    });
  });

  it("確定で番号が null の行も、直さずにそのまま返す（画面が目立たせる）", () => {
    expect(photoFromRow({ ...ROW, field_id: null, state: "confirmed" })).toMatchObject({ fieldId: null, state: "confirmed" });
  });

  it("候補の並びはそのまま（近い順）", () => {
    expect(photoFromRow({ ...ROW, candidate_field_ids: '["A-09","A-01","A-04"]' }).candidateFieldIds).toEqual([
      "A-09",
      "A-01",
      "A-04",
    ]);
  });

  it("行にほかの列があっても写さない（ハッシュなどを漏らさない）", () => {
    const row = { ...ROW, content_hash: "ab".repeat(32), r2_key: "uploads/p1.jpg" } as PhotoListRow;
    const text = JSON.stringify(photoFromRow(row));
    expect(text).not.toContain("ab".repeat(32));
    expect(text).not.toContain("uploads/");
  });

  it.each([
    ["JSON でない", "nope"],
    ["オブジェクト", "{}"],
    ["数の配列", "[1]"],
    ["文字列", '"A-01"'],
    ["null", "null"],
    // 攻撃役の指摘: 先頭だけ文字列で、後ろが違う配列も例外
    ["後ろに数", '["A-01",1]'],
    ["後ろに null", '["A-01",null]'],
    ["入れ子", '["A-01",["A-02"]]'],
  ])("候補の列が %s なら例外（壊れた行を隠さない）", (_name, raw) => {
    expect(() => photoFromRow({ ...ROW, candidate_field_ids: raw })).toThrow(/candidate_field_ids/);
  });

  it("入力の行を変えない", () => {
    const row = Object.freeze({ ...ROW });
    expect(photoFromRow(row).id).toBe("p1");
    expect(row).toEqual(ROW);
  });
});

describe("parseFieldIdQuery（T22）", () => {
  const KNOWN: ReadonlySet<string> = new Set(["A-01", "A-02", "A-12"]);

  it.each(["A-01", "A-02", "A-12"])("一覧にある %s はそのまま返す", (id) => {
    expect(parseFieldIdQuery(id, KNOWN)).toBe(id);
  });

  it.each([
    ["null", null],
    ["空", ""],
    ["一覧に無い番号", "A-13"],
    ["小文字", "a-01"],
    ["前の空白", " A-01"],
    ["後ろの空白", "A-01 "],
    ["区切りなし", "A01"],
    ["前に 0 を足した", "A-001"],
    ["2 つつないだ", "A-01,A-02"],
    ["SQL らしい文字", "A-01' OR '1'='1"],
    ["継承された名前 constructor", "constructor"],
    ["継承された名前 __proto__", "__proto__"],
    ["4000 文字の文字列", "A-01".repeat(1000)],
  ])("%s は null", (_label, raw) => {
    expect(parseFieldIdQuery(raw, KNOWN)).toBeNull();
  });

  it("一覧が空なら何でも null", () => {
    expect(parseFieldIdQuery("A-01", new Set())).toBeNull();
  });

  it("一覧を変えない", () => {
    const known = new Set(["A-01"]);
    parseFieldIdQuery("A-02", known);
    parseFieldIdQuery("A-01", known);
    expect([...known]).toEqual(["A-01"]);
  });
});
