import { describe, expect, it, vi } from "vitest";

// 攻撃役（T25 の 2 回目）: parseStatusInput を呼ばずに検証を手で写しても、結果の比べ合わせだけなら通った。
// 中身の検証は T12 に任せる（同じ決まりを 2 か所に書かない）ので、差し替えて呼ばれることを確かめる
const parseStatusInput = vi.fn();
vi.mock("./status-reason", () => ({ parseStatusInput: (...args: unknown[]) => parseStatusInput(...args) }));

const { parseStatusBody } = await import("./status-request");

describe("parseStatusBody は中身の検証を parseStatusInput に任せる（T25）", () => {
  it("JSON を読んだ値と、渡された集合をそのまま渡し、ok ならその値を返す", () => {
    const value = { status: "done", reasons: [], note: "差し替えた値", refPhotoIds: ["x"] };
    parseStatusInput.mockReturnValueOnce({ ok: true, value });
    const set = new Set(["p1"]);
    expect(parseStatusBody('{"anything":[1,2]}', set)).toStrictEqual({ ok: true, value });
    expect(parseStatusInput).toHaveBeenCalledTimes(1);
    expect(parseStatusInput.mock.calls[0][0]).toStrictEqual({ anything: [1, 2] });
    expect(parseStatusInput.mock.calls[0][1]).toBe(set);
  });

  it("parseStatusInput の理由を 422 にそのまま写す", () => {
    parseStatusInput.mockReturnValueOnce({ ok: false, reason: "too_many_ref_photos" });
    expect(parseStatusBody('{"status":"ready","reasons":[],"refPhotoIds":[]}', new Set())).toStrictEqual({
      ok: false,
      status: 422,
      reason: "too_many_ref_photos",
    });
  });

  it("JSON でなければ parseStatusInput を呼ばずに 400", () => {
    parseStatusInput.mockClear();
    expect(parseStatusBody("{", new Set())).toStrictEqual({ ok: false, status: 400 });
    expect(parseStatusInput).not.toHaveBeenCalled();
  });
});
