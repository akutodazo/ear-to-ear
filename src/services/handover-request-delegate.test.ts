import { describe, expect, it, vi } from "vitest";
import type { HandoverRecord } from "@/types";

// 要素と引用の写しは T27・T28 の Service に 1 か所だけ。設定も src/config.ts に 1 回だけ。
// 差し替えて、それに従うことを確かめる（自前で書き直す実装を防ぐ）
const handoverContent = vi.fn();
const toHandoverBlocks = vi.fn();
vi.mock("./handover-document", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./handover-document")>()),
  handoverContent: (records: unknown) => handoverContent(records),
}));
vi.mock("./handover-citations", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./handover-citations")>()),
  toHandoverBlocks: (content: unknown, count: number) => toHandoverBlocks(content, count),
}));
vi.mock("@/config", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/config")>()),
  CLAUDE_MODEL: "model-from-config",
  CLAUDE_MAX_TOKENS: 77,
}));

const { buildHandoverRequest, readHandoverReply } = await import("./handover-request");

const RECORDS: HandoverRecord[] = [{ kind: "status", id: "3", text: "t" }];

describe("buildHandoverRequest は handoverContent と設定に従う（T30）", () => {
  it("文書の中身は handoverContent の戻り、model・max_tokens は設定", () => {
    handoverContent.mockReturnValue([{ type: "text", text: "差し替えた要素" }]);
    const body = buildHandoverRequest("A-06", "2026", RECORDS);
    expect(handoverContent).toHaveBeenCalledWith(RECORDS);
    expect(body.messages[0].content[0].source.content).toStrictEqual([{ type: "text", text: "差し替えた要素" }]);
    expect([body.model, body.max_tokens]).toStrictEqual(["model-from-config", 77]);
  });
});

describe("readHandoverReply は toHandoverBlocks に任せる（T30）", () => {
  it("content と要素の数を渡し、その戻りを blocks にする", () => {
    toHandoverBlocks.mockReturnValue([{ text: "差し替え", cites: [] }]);
    const content = [{ type: "text", text: "x" }];
    expect(readHandoverReply(200, { stop_reason: "end_turn", content }, 5)).toStrictEqual({
      ok: true,
      blocks: [{ text: "差し替え", cites: [] }],
    });
    expect(toHandoverBlocks).toHaveBeenCalledWith(content, 5);
  });

  it("toHandoverBlocks の例外は shape にする（外に出さない）", () => {
    toHandoverBlocks.mockImplementation(() => {
      throw new Error("返事の形が違う");
    });
    expect(readHandoverReply(200, { stop_reason: "end_turn", content: [] }, 1)).toStrictEqual({ ok: false, reason: "shape" });
  });
});
