import { describe, expect, it } from "vitest";
import { buildUploadMeta, type UploadMetaInput } from "./upload-request";

const input: UploadMetaInput = {
  contentHash: "b".repeat(64),
  takenAt: "2026-07-21",
  takenAtSource: "xmp",
  candidateFieldIds: ["A-03", "A-04"],
  chosenFieldId: "A-05",
};

describe("buildUploadMeta（送る meta。K6 の守りどころ）", () => {
  it("UploadMeta の5項目だけを、そのままの値で返す", () => {
    expect(buildUploadMeta(input)).toEqual({
      contentHash: "b".repeat(64),
      takenAt: "2026-07-21",
      takenAtSource: "xmp",
      candidateFieldIds: ["A-03", "A-04"],
      chosenFieldId: "A-05",
    });
  });

  it("撮影位置・距離など余分な項目が入力に紛れても、送る meta には出さない", () => {
    // 画面の中では撮影位置と距離を持っている。それが混ざった入力を渡しても落ちること
    const leaky = {
      ...input,
      position: { lat: 41.807, lng: 144.51 },
      lat: 41.807,
      lng: 144.51,
      candidates: [{ fieldId: "A-03", meters: 120 }],
      distances: [120, 380],
    } as UploadMetaInput;
    const meta = buildUploadMeta(leaky);
    expect(Object.keys(meta).sort()).toEqual(
      ["candidateFieldIds", "chosenFieldId", "contentHash", "takenAt", "takenAtSource"].sort(),
    );
    const text = JSON.stringify(meta);
    expect(text).not.toContain("41.807");
    expect(text).not.toContain("144.51");
    expect(text).not.toContain("120");
  });

  it("候補の番号は文字列の新しい配列（元の配列と別物）", () => {
    const meta = buildUploadMeta(input);
    expect(meta.candidateFieldIds).not.toBe(input.candidateFieldIds);
    expect(meta.candidateFieldIds.every((id) => typeof id === "string")).toBe(true);
  });

  it("日付不明・選択なしもそのまま null で送る（推測しない）", () => {
    const meta = buildUploadMeta({ ...input, takenAt: null, takenAtSource: "none", chosenFieldId: null });
    expect(meta.takenAt).toBeNull();
    expect(meta.takenAtSource).toBe("none");
    expect(meta.chosenFieldId).toBeNull();
  });
});
