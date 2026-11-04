import { describe, expect, it } from "vitest";
import { STATUS_NOTE_MAX_CHARS, STATUS_REASONS, STATUS_REF_PHOTOS_MAX } from "../config";
import { parseStatusInput, type StatusInputReason } from "./status-reason";

/** その圃場に確定済みの写真 */
const MINE = new Set(["p1", "p2", "p3", "p4", "p5", "p6"]);

function body(change: Record<string, unknown> = {}): Record<string, unknown> {
  return { status: "ready", reasons: ["ear_color"], note: "穂が黄色い", refPhotoIds: ["p1"], ...change };
}

function reasonOf(input: unknown, mine: ReadonlySet<string> = MINE): StatusInputReason | "ok" {
  const result = parseStatusInput(input, mine);
  return result.ok ? "ok" : result.reason;
}

describe("parseStatusInput: 通るもの（T12）", () => {
  it("収穫可能・理由・メモ・根拠の写真がそろった入力", () => {
    expect(parseStatusInput(body(), MINE)).toStrictEqual({
      ok: true,
      value: { status: "ready", reasons: ["ear_color"], note: "穂が黄色い", refPhotoIds: ["p1"] },
    });
  });

  it("収穫済（done）も通る", () => {
    expect(parseStatusInput(body({ status: "done" }), MINE)).toMatchObject({ ok: true, value: { status: "done" } });
  });

  it("選択肢のどのコードも通り、入力の順を保つ", () => {
    const all = STATUS_REASONS.map((r) => r.code).reverse();
    expect(parseStatusInput(body({ reasons: all }), MINE)).toMatchObject({ ok: true, value: { reasons: all } });
  });

  it("理由は 0 個でもよい（「記録なし」として残す。11-03 本人決定）", () => {
    expect(parseStatusInput(body({ reasons: [] }), MINE)).toMatchObject({ ok: true, value: { reasons: [] } });
  });

  it("「その他」を選んでもメモは任意（11-03 本人決定）", () => {
    const result = parseStatusInput(body({ reasons: ["other"], note: undefined }), MINE);
    expect(result).toStrictEqual({
      ok: true,
      value: { status: "ready", reasons: ["other"], note: null, refPhotoIds: ["p1"] },
    });
  });

  it("メモが無い・null・空白だけなら note は null。前後の空白は除く", () => {
    const { note: _omit, ...withoutNote } = body();
    void _omit;
    expect(parseStatusInput(withoutNote, MINE)).toMatchObject({ ok: true, value: { note: null } });
    expect(parseStatusInput(body({ note: null }), MINE)).toMatchObject({ ok: true, value: { note: null } });
    expect(parseStatusInput(body({ note: "  \n " }), MINE)).toMatchObject({ ok: true, value: { note: null } });
    expect(parseStatusInput(body({ note: "" }), MINE)).toMatchObject({ ok: true, value: { note: null } });
    expect(parseStatusInput(body({ note: "  黄色が多い \n" }), MINE)).toMatchObject({
      ok: true,
      value: { note: "黄色が多い" },
    });
  });

  it("全角の空白・タブだけのメモも null（trim と同じく空白として扱う）", () => {
    expect(parseStatusInput(body({ note: "　　" }), MINE)).toMatchObject({ ok: true, value: { note: null } });
    expect(parseStatusInput(body({ note: "\t\t" }), MINE)).toMatchObject({ ok: true, value: { note: null } });
    expect(parseStatusInput(body({ note: "　黄色が多い\t" }), MINE)).toMatchObject({
      ok: true,
      value: { note: "黄色が多い" },
    });
  });

  it("メモの中の改行は残す", () => {
    expect(parseStatusInput(body({ note: "1行目\n2行目" }), MINE)).toMatchObject({ ok: true, value: { note: "1行目\n2行目" } });
  });

  it("根拠の写真は 0 枚でもよく、5 枚ちょうどまで通る。入力の順を保つ", () => {
    expect(parseStatusInput(body({ refPhotoIds: [] }), MINE)).toMatchObject({ ok: true, value: { refPhotoIds: [] } });
    const five = ["p5", "p3", "p1", "p2", "p4"];
    expect(five).toHaveLength(STATUS_REF_PHOTOS_MAX);
    expect(parseStatusInput(body({ refPhotoIds: five }), MINE)).toMatchObject({ ok: true, value: { refPhotoIds: five } });
  });

  it("メモは見た目の文字（コードポイント）で 200 字ちょうどまで通る。絵文字・サロゲートも 1 字", () => {
    const plain = "あ".repeat(STATUS_NOTE_MAX_CHARS);
    expect(reasonOf(body({ note: plain }))).toBe("ok");
    const emoji = "🌾".repeat(STATUS_NOTE_MAX_CHARS);
    expect(emoji.length).toBe(STATUS_NOTE_MAX_CHARS * 2);
    expect(reasonOf(body({ note: emoji }))).toBe("ok");
  });

  it("絵文字と普通の字が混ざっても 1 字ずつ数える（200 字は通り、201 字は拒む）", () => {
    expect(reasonOf(body({ note: `${"あ".repeat(STATUS_NOTE_MAX_CHARS - 1)}🌾` }))).toBe("ok");
    expect(reasonOf(body({ note: `🌾${"あ".repeat(STATUS_NOTE_MAX_CHARS)}` }))).toBe("note_too_long");
  });

  it("前後の空白を除いた後の長さで数える", () => {
    expect(reasonOf(body({ note: `  ${"あ".repeat(STATUS_NOTE_MAX_CHARS)}  ` }))).toBe("ok");
  });

  it("元の入力（配列）を変えず、返す配列は写し", () => {
    const reasons = ["yellow_ratio", "ear_color"];
    const refPhotoIds = ["p2", "p1"];
    const input = body({ reasons, refPhotoIds });
    const result = parseStatusInput(input, MINE);
    expect(reasons).toStrictEqual(["yellow_ratio", "ear_color"]);
    expect(refPhotoIds).toStrictEqual(["p2", "p1"]);
    if (!result.ok) throw new Error("通るはず");
    expect(result.value.reasons).not.toBe(reasons);
    expect(result.value.refPhotoIds).not.toBe(refPhotoIds);
  });

  it("返す値は status・reasons・note・refPhotoIds の 4 つだけ", () => {
    const result = parseStatusInput(body(), MINE);
    if (!result.ok) throw new Error("通るはず");
    expect(Object.keys(result.value).sort()).toStrictEqual(["note", "reasons", "refPhotoIds", "status"]);
  });
});

describe("parseStatusInput: 拒むもの（T12）", () => {
  it.each<[string, unknown, StatusInputReason]>([
    ["null", null, "not_object"],
    ["配列", [], "not_object"],
    ["文字列", "ready", "not_object"],
    ["数値", 1, "not_object"],
    ["ほかのキー", body({ fieldId: "A-06" }), "unknown_key"],
    ["キーは 4 つ以下でも、1 つが知らないキー", { status: "ready", reasons: [], refPhotoIds: [], memo: "x" }, "unknown_key"],
    ["__proto__ のキー", JSON.parse('{"status":"ready","reasons":[],"refPhotoIds":[],"__proto__":{}}'), "unknown_key"],
    ["status が無い", body({ status: undefined }), "bad_status"],
    ["status が選択肢に無い", body({ status: "maybe" }), "bad_status"],
    ["status の大文字", body({ status: "READY" }), "bad_status"],
    ["status が null", body({ status: null }), "bad_status"],
    ["status が数値", body({ status: 1 }), "bad_status"],
    ["reasons が無い", body({ reasons: undefined }), "bad_reasons"],
    ["reasons が配列でない", body({ reasons: "ear_color" }), "bad_reasons"],
    ["reasons に文字列でないもの", body({ reasons: [1] }), "bad_reasons"],
    ["選択肢に無い理由", body({ reasons: ["grain_hardness"] }), "unknown_reason"],
    ["理由の大文字", body({ reasons: ["EAR_COLOR"] }), "unknown_reason"],
    ["理由が空文字", body({ reasons: [""] }), "unknown_reason"],
    ["理由の前後に空白", body({ reasons: [" ear_color"] }), "unknown_reason"],
    ["同じ理由が二つ", body({ reasons: ["ear_color", "other", "ear_color"] }), "duplicate_reason"],
    ["同じ理由が末尾で続く", body({ reasons: ["ear_color", "yellow_ratio", "yellow_ratio"] }), "duplicate_reason"],
    ["同じ理由が中ほどで離れて", body({ reasons: ["ear_color", "yellow_ratio", "other", "yellow_ratio"] }), "duplicate_reason"],
    ["メモが数値", body({ note: 5 }), "bad_note"],
    ["メモが配列", body({ note: ["a"] }), "bad_note"],
    ["メモが 201 字", body({ note: "あ".repeat(STATUS_NOTE_MAX_CHARS + 1) }), "note_too_long"],
    ["メモが絵文字 201 字", body({ note: "🌾".repeat(STATUS_NOTE_MAX_CHARS + 1) }), "note_too_long"],
    ["refPhotoIds が無い", body({ refPhotoIds: undefined }), "bad_ref_photos"],
    ["refPhotoIds が配列でない", body({ refPhotoIds: "p1" }), "bad_ref_photos"],
    ["refPhotoIds に文字列でないもの", body({ refPhotoIds: [1] }), "bad_ref_photos"],
    ["refPhotoIds に空文字", body({ refPhotoIds: [""] }), "bad_ref_photos"],
    ["根拠の写真が 6 枚", body({ refPhotoIds: ["p1", "p2", "p3", "p4", "p5", "p6"] }), "too_many_ref_photos"],
    ["同じ写真が二つ", body({ refPhotoIds: ["p1", "p2", "p1"] }), "duplicate_ref_photo"],
    ["同じ写真が末尾で続く", body({ refPhotoIds: ["p1", "p2", "p2"] }), "duplicate_ref_photo"],
    ["同じ写真が中ほどで離れて", body({ refPhotoIds: ["p1", "p2", "p3", "p2"] }), "duplicate_ref_photo"],
    ["その圃場に確定済みでない写真（ほかの圃場・未確定・存在しない）", body({ refPhotoIds: ["p1", "other-field"] }), "ref_photo_not_in_field"],
  ])("%s は %s", (_, input, reason) => {
    expect(reasonOf(input)).toBe(reason);
  });

  it("確定済みの写真が無い圃場では、根拠の写真を付けられない（0 枚なら通る）", () => {
    expect(reasonOf(body({ refPhotoIds: ["p1"] }), new Set())).toBe("ref_photo_not_in_field");
    expect(reasonOf(body({ refPhotoIds: [] }), new Set())).toBe("ok");
  });

  it("写真の id は完全一致（大文字小文字・前後の空白を区別する）", () => {
    expect(reasonOf(body({ refPhotoIds: ["P1"] }))).toBe("ref_photo_not_in_field");
    expect(reasonOf(body({ refPhotoIds: [" p1"] }))).toBe("ref_photo_not_in_field");
  });

  it("例外を出さない（どんな値でも結果を返す）", () => {
    for (const input of [undefined, Symbol("x"), () => 0, new Date(0), { toString: null }]) {
      expect(() => parseStatusInput(input, MINE)).not.toThrow();
      expect(parseStatusInput(input, MINE).ok).toBe(false);
    }
  });
});
