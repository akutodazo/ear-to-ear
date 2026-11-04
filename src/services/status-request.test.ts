import { describe, expect, it } from "vitest";
import { parseStatusInput } from "./status-reason";
import { parseStatusBody, STATUS_BODY_MAX_BYTES } from "./status-request";

const CONFIRMED = new Set(["p1", "p2"]);

describe("parseStatusBody（POST /api/fields/:id/status の本文、T25）", () => {
  it("正しい本文は parseStatusInput の値（メモは前後の空白を除く）", () => {
    expect(
      parseStatusBody('{"status":"ready","reasons":["ear_color"],"note":"  南が先  ","refPhotoIds":["p2","p1"]}', CONFIRMED),
    ).toStrictEqual({
      ok: true,
      value: { status: "ready", reasons: ["ear_color"], note: "南が先", refPhotoIds: ["p2", "p1"] },
    });
  });

  it("note が無くても通る（null）", () => {
    expect(parseStatusBody('{"status":"done","reasons":[],"refPhotoIds":[]}', CONFIRMED)).toStrictEqual({
      ok: true,
      value: { status: "done", reasons: [], note: null, refPhotoIds: [] },
    });
  });

  it.each([
    ["空", ""],
    ["JSON でない", "status=ready"],
    ["途中で切れた JSON", '{"status":"ready"'],
    ["末尾にごみ", '{"status":"ready","reasons":[],"refPhotoIds":[]}x'],
  ])("%s なら 400", (_label, text) => {
    expect(parseStatusBody(text, CONFIRMED)).toStrictEqual({ ok: false, status: 400 });
  });

  it.each([
    ["配列", "[]", "not_object"],
    ["null", "null", "not_object"],
    ["数", "1", "not_object"],
    ["知らないキー", '{"status":"ready","reasons":[],"refPhotoIds":[],"fieldId":"A-01"}', "unknown_key"],
    ["status が違う", '{"status":"maybe","reasons":[],"refPhotoIds":[]}', "bad_status"],
    ["知らない理由", '{"status":"ready","reasons":["moisture_ok"],"refPhotoIds":[]}', "unknown_reason"],
    ["メモが長い", `{"status":"ready","reasons":[],"note":"${"あ".repeat(201)}","refPhotoIds":[]}`, "note_too_long"],
    ["根拠が圃場の確定済みでない", '{"status":"ready","reasons":[],"refPhotoIds":["p9"]}', "ref_photo_not_in_field"],
  ])("JSON だが中身が %s なら 422 と理由 %s", (_label, text, reason) => {
    expect(parseStatusBody(text, CONFIRMED)).toStrictEqual({ ok: false, status: 422, reason });
  });

  it("根拠の写真は渡した集合で判定する（集合が空なら、どの写真も通らない）", () => {
    const text = '{"status":"ready","reasons":[],"refPhotoIds":["p1"]}';
    expect(parseStatusBody(text, new Set())).toStrictEqual({ ok: false, status: 422, reason: "ref_photo_not_in_field" });
    expect(parseStatusBody(text, new Set(["p1"]))).toMatchObject({ ok: true });
  });

  // 攻撃役（T25 の 1 回目）: parseStatusInput を呼ばず、テストの値（"maybe"・201 字・6 枚など）だけ見ても通った。
  // 中身の検証は T12 の parseStatusInput と同じ結果になること（JSON の後はそのまま任せる）を、多くの入力で確かめる
  const SAMPLES: unknown[] = [
    { status: "done", reasons: [], refPhotoIds: [] },
    { status: "foo", reasons: [], refPhotoIds: [] },
    { status: "", reasons: [], refPhotoIds: [] },
    { status: 1, reasons: [], refPhotoIds: [] },
    { status: null, reasons: [], refPhotoIds: [] },
    { reasons: [], refPhotoIds: [] },
    { status: "ready", reasons: "ear_color", refPhotoIds: [] },
    { status: "ready", reasons: null, refPhotoIds: [] },
    { status: "ready", refPhotoIds: [] },
    { status: "ready", reasons: ["ear_color", 1], refPhotoIds: [] },
    { status: "ready", reasons: ["rain"], refPhotoIds: [] },
    { status: "ready", reasons: ["ear_color", "other", "ear_color"], refPhotoIds: [] },
    { status: "ready", reasons: [], note: 5, refPhotoIds: [] },
    { status: "ready", reasons: [], note: ["a"], refPhotoIds: [] },
    { status: "ready", reasons: [], note: "い".repeat(200), refPhotoIds: [] },
    { status: "ready", reasons: [], note: "い".repeat(202), refPhotoIds: [] },
    { status: "ready", reasons: [], note: "🌾".repeat(200), refPhotoIds: [] },
    { status: "ready", reasons: [], note: "🌾".repeat(201), refPhotoIds: [] },
    { status: "ready", reasons: [] },
    { status: "ready", reasons: [], refPhotoIds: "p1" },
    { status: "ready", reasons: [], refPhotoIds: [""] },
    { status: "ready", reasons: [], refPhotoIds: ["p1", 2] },
    { status: "ready", reasons: [], refPhotoIds: ["p1", "p2", "p1"] },
    { status: "ready", reasons: [], refPhotoIds: ["p1", "p2", "p3", "p4", "p5", "p6", "p7"] },
    { status: "ready", reasons: [], refPhotoIds: ["p2", "p3"] },
    { status: "ready", reasons: ["other"], note: "x", refPhotoIds: ["p1"], extra: 1 },
    "ready",
    true,
  ];
  it.each(SAMPLES.map((s) => [JSON.stringify(s)]))("JSON の後の結果は parseStatusInput と同じ（%s）", (text) => {
    const confirmed = new Set(["p1", "p2", "p3", "p4", "p5", "p6", "p7"].slice(0, 2));
    const expected = parseStatusInput(JSON.parse(text), confirmed);
    expect(parseStatusBody(text, confirmed)).toStrictEqual(
      expected.ok ? { ok: true, value: expected.value } : { ok: false, status: 422, reason: expected.reason },
    );
  });

  it("__proto__ のキーも知らないキーとして数える", () => {
    expect(parseStatusBody('{"status":"ready","reasons":[],"refPhotoIds":[],"__proto__":{}}', CONFIRMED)).toStrictEqual({
      ok: false,
      status: 422,
      reason: "unknown_key",
    });
  });

  it("上限は、メモ 200 字（1 字 4 バイト）・理由 5 つ・根拠 5 枚（UUID）の本文が入る大きさ", () => {
    const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
    const body = JSON.stringify({
      status: "ready",
      reasons: ["ear_color", "yellow_ratio", "ja_stop_moisture", "ja_stop_damage", "other"],
      note: "🌾".repeat(200),
      refPhotoIds: [1, 2, 3, 4, 5].map(uuid),
    });
    expect(new TextEncoder().encode(body).byteLength).toBeLessThanOrEqual(STATUS_BODY_MAX_BYTES);
  });
});
