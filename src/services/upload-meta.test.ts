import { describe, expect, it } from "vitest";
import { parseUploadMeta, UPLOAD_META_MAX_CHARS } from "./upload-meta";

const HASH = "a".repeat(64);
const KNOWN = new Set(["A-01", "A-02", "A-03", "A-04", "A-05"]);

const VALID = {
  contentHash: HASH,
  takenAt: "2026-07-21",
  takenAtSource: "xmp",
  candidateFieldIds: ["A-03", "A-01", "A-02"],
  chosenFieldId: "A-03",
};

function parse(body: unknown, known: ReadonlySet<string> = KNOWN) {
  return parseUploadMeta(JSON.stringify(body), known);
}

function reasonOf(body: unknown, known: ReadonlySet<string> = KNOWN) {
  const result = parse(body, known);
  return result.ok ? "ok" : result.reason;
}

function without(key: keyof typeof VALID) {
  const { [key]: _removed, ...rest } = VALID;
  return rest;
}

describe("正しい meta", () => {
  it("5 つのキーだけの新しい値が返る", () => {
    expect(parse(VALID)).toStrictEqual({ ok: true, meta: VALID });
  });

  it("位置も日時も無い写真（候補が空・takenAt が null・none）が通る", () => {
    const body = { ...VALID, takenAt: null, takenAtSource: "none", candidateFieldIds: [] };
    expect(parse(body)).toStrictEqual({ ok: true, meta: body });
  });

  it("exif と日付の組が通る", () => {
    expect(reasonOf({ ...VALID, takenAtSource: "exif" })).toBe("ok");
  });

  it.each([[["A-05"]], [["A-05", "A-04"]]])("候補が %j でも通り、順は入力のまま", (ids) => {
    const result = parse({ ...VALID, candidateFieldIds: ids });
    expect(result).toStrictEqual({ ok: true, meta: { ...VALID, candidateFieldIds: ids } });
  });
});

describe("chosenFieldId", () => {
  it("省略すると null になる", () => {
    expect(parse(without("chosenFieldId"))).toStrictEqual({
      ok: true,
      meta: { ...VALID, chosenFieldId: null },
    });
  });

  it("null はそのまま null", () => {
    expect(parse({ ...VALID, chosenFieldId: null })).toStrictEqual({
      ok: true,
      meta: { ...VALID, chosenFieldId: null },
    });
  });

  it("候補に無い既知の番号も通る（位置の無い写真で委員が選ぶため）", () => {
    const body = { ...VALID, candidateFieldIds: [], chosenFieldId: "A-05" };
    expect(parse(body)).toStrictEqual({ ok: true, meta: body });
  });

  it.each([
    ["未知の番号", "A-99"],
    ["空文字", ""],
    ["数", 1],
    ["オブジェクト", { id: "A-01" }],
    ["配列", ["A-01"]],
  ])("%s は bad_chosen_field", (_name, chosenFieldId) => {
    expect(reasonOf({ ...VALID, chosenFieldId })).toBe("bad_chosen_field");
  });
});

describe("JSON の形", () => {
  it.each([
    ["空文字", ""],
    ["JSON でない", "not json"],
    ["途中で切れた", '{"contentHash":'],
  ])("%s は not_json", (_name, text) => {
    expect(parseUploadMeta(text, KNOWN)).toStrictEqual({ ok: false, reason: "not_json" });
  });

  it.each([
    ["配列", "[]"],
    ["null", "null"],
    ["数", "42"],
    ["文字列", '"meta"'],
    ["真偽", "true"],
  ])("%s は not_object", (_name, text) => {
    expect(parseUploadMeta(text, KNOWN)).toStrictEqual({ ok: false, reason: "not_object" });
  });

  it("上限ちょうどの長さは通る", () => {
    const text = JSON.stringify(VALID).padEnd(UPLOAD_META_MAX_CHARS, " ");
    expect(parseUploadMeta(text, KNOWN).ok).toBe(true);
  });

  it("上限を超えると、中身が正しくても too_long", () => {
    const text = JSON.stringify(VALID).padEnd(UPLOAD_META_MAX_CHARS + 1, " ");
    expect(parseUploadMeta(text, KNOWN)).toStrictEqual({ ok: false, reason: "too_long" });
  });

  it("上限は 1024 文字", () => {
    expect(UPLOAD_META_MAX_CHARS).toBe(1024);
  });
});

describe("許可していない項目（K6）", () => {
  it.each([
    "foo",
    "lat",
    "lng",
    "latitude",
    "longitude",
    "position",
    "gps",
    "distance",
    "distanceMeters",
    "distances",
    "d",
    "距離",
  ])("%s があれば unknown_key", (key) => {
    expect(reasonOf({ ...VALID, [key]: 120 })).toBe("unknown_key");
  });

  it("値が null でも unknown_key", () => {
    expect(reasonOf({ ...VALID, lat: null })).toBe("unknown_key");
  });

  it("大文字違いのキーも unknown_key", () => {
    expect(reasonOf({ ...VALID, ContentHash: HASH })).toBe("unknown_key");
  });

  it("JSON の __proto__ も unknown_key", () => {
    const text = `{"__proto__":{"lat":41.8},${JSON.stringify(VALID).slice(1)}`;
    expect(parseUploadMeta(text, KNOWN)).toStrictEqual({ ok: false, reason: "unknown_key" });
  });

  it("toString のような Object の名前も unknown_key", () => {
    const text = `{"toString":1,${JSON.stringify(VALID).slice(1)}`;
    expect(parseUploadMeta(text, KNOWN)).toStrictEqual({ ok: false, reason: "unknown_key" });
  });

  it.each([
    ["候補がオブジェクト", { ...VALID, candidateFieldIds: [{ id: "A-01", dist: 120 }] }],
    ["候補が入れ子の配列", { ...VALID, candidateFieldIds: [["A-01", 120]] }],
    ["候補が数", { ...VALID, candidateFieldIds: [120] }],
  ])("%s は bad_candidates（入れ子で距離を送らせない）", (_name, body) => {
    expect(reasonOf(body)).toBe("bad_candidates");
  });
});

describe("必須の項目", () => {
  it.each(["contentHash", "takenAt", "takenAtSource", "candidateFieldIds"] as const)(
    "%s が無ければ missing_key",
    (key) => {
      expect(reasonOf(without(key))).toBe("missing_key");
    },
  );
});

describe("contentHash", () => {
  it("大文字は小文字に直して返す（二重登録の判定を表記に左右させない）", () => {
    const result = parse({ ...VALID, contentHash: "ABCDEF".padEnd(64, "0") });
    expect(result).toStrictEqual({
      ok: true,
      meta: { ...VALID, contentHash: "abcdef".padEnd(64, "0") },
    });
  });

  it("大文字と小文字が混ざっても小文字に直す", () => {
    const result = parse({ ...VALID, contentHash: "aBcDeF".padEnd(64, "0") });
    expect(result.ok && result.meta.contentHash).toBe("abcdef".padEnd(64, "0"));
  });

  it.each([
    ["63 桁", "a".repeat(63)],
    ["65 桁", "a".repeat(65)],
    ["16 進でない", "g".repeat(64)],
    ["末尾に改行", `${"a".repeat(64)}\n`],
    ["空文字", ""],
    ["数", 1],
    ["null", null],
  ])("%s は bad_content_hash", (_name, contentHash) => {
    expect(reasonOf({ ...VALID, contentHash })).toBe("bad_content_hash");
  });
});

describe("takenAt", () => {
  it.each([
    ["ゼロ埋めなし", "2026-7-21"],
    ["区切りが違う", "2026/07/21"],
    ["日時つき", "2026-07-21T10:00:00+09:00"],
    ["末尾に改行", "2026-07-21\n"],
    ["実在しない日", "2026-02-30"],
    ["閏年でない 2/29", "2026-02-29"],
    ["13 月", "2026-13-01"],
    ["0 日", "2026-07-00"],
    ["数", 20260721],
    ["空文字", ""],
  ])("%s は bad_taken_at", (_name, takenAt) => {
    expect(reasonOf({ ...VALID, takenAt })).toBe("bad_taken_at");
  });

  it("閏年の 2/29 は通る", () => {
    expect(reasonOf({ ...VALID, takenAt: "2028-02-29" })).toBe("ok");
  });
});

describe("takenAtSource", () => {
  it.each([
    ["不正な値", "gps"],
    ["大文字", "XMP"],
    ["空文字", ""],
    ["null", null],
    ["数", 1],
  ])("%s は bad_taken_at_source", (_name, takenAtSource) => {
    expect(reasonOf({ ...VALID, takenAtSource })).toBe("bad_taken_at_source");
  });

  it.each([
    ["none なのに日付がある", { takenAtSource: "none", takenAt: "2026-07-21" }],
    ["xmp なのに日付が無い", { takenAtSource: "xmp", takenAt: null }],
    ["exif なのに日付が無い", { takenAtSource: "exif", takenAt: null }],
  ])("%s は taken_at_mismatch", (_name, overrides) => {
    expect(reasonOf({ ...VALID, ...overrides })).toBe("taken_at_mismatch");
  });
});

describe("candidateFieldIds", () => {
  it.each([
    ["文字列", "A-01"],
    ["null", null],
    ["オブジェクト", { 0: "A-01" }],
  ])("%s は bad_candidates", (_name, candidateFieldIds) => {
    expect(reasonOf({ ...VALID, candidateFieldIds })).toBe("bad_candidates");
  });

  it("4 件は too_many_candidates", () => {
    const candidateFieldIds = ["A-01", "A-02", "A-03", "A-04"];
    expect(reasonOf({ ...VALID, candidateFieldIds })).toBe("too_many_candidates");
  });

  it("重複は duplicate_candidate", () => {
    expect(reasonOf({ ...VALID, candidateFieldIds: ["A-01", "A-01"] })).toBe("duplicate_candidate");
  });

  it.each(["A-99", "a-01", "A-1", ""])("未知の番号 %j は unknown_field", (id) => {
    expect(reasonOf({ ...VALID, candidateFieldIds: ["A-01", id] })).toBe("unknown_field");
  });

  it("既知の番号が空なら、候補が 1 件でも unknown_field", () => {
    const body = { ...VALID, candidateFieldIds: ["A-01"], chosenFieldId: null };
    expect(reasonOf(body, new Set())).toBe("unknown_field");
  });
});

describe("暦の境界（攻撃役の指摘）", () => {
  it.each(["2026-04-31", "2026-06-31", "2026-09-31", "2026-11-31", "1900-02-29", "2100-02-29"])(
    "%s は bad_taken_at",
    (takenAt) => {
      expect(reasonOf({ ...VALID, takenAt })).toBe("bad_taken_at");
    },
  );

  it.each(["2024-02-29", "2032-02-29", "2000-02-29", "2026-04-30", "2026-12-31", "2026-01-31"])(
    "%s は通る",
    (takenAt) => {
      expect(reasonOf({ ...VALID, takenAt })).toBe("ok");
    },
  );
});
