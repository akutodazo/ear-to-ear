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
