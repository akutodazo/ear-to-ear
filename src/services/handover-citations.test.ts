import { describe, expect, it } from "vitest";
import { toHandoverBlocks } from "./handover-citations";

/** 文書 0 の要素 start〜end（end は含まない）を指す引用 */
function cite(start: number, end: number, citedText = `要素 ${start}`, change: Record<string, unknown> = {}) {
  return {
    type: "content_block_location",
    cited_text: citedText,
    document_index: 0,
    document_title: "A-06 の記録",
    start_block_index: start,
    end_block_index: end,
    ...change,
  };
}

describe("toHandoverBlocks: 引用を記録に対応付ける（T28）", () => {
  it("text のブロックごとに、文と引用（番号の範囲と引用の文）を写す", () => {
    const blocks = toHandoverBlocks(
      [
        { type: "text", text: "A-06 は " },
        { type: "text", text: "7 月 21 日に収穫可能と判断された", citations: [cite(1, 2, "[判断 3] 2026-07-21 収穫可能。")] },
        { type: "text", text: "。" },
      ],
      3,
    );
    expect(blocks).toStrictEqual([
      { text: "A-06 は ", cites: [] },
      { text: "7 月 21 日に収穫可能と判断された", cites: [{ start: 1, end: 2, citedText: "[判断 3] 2026-07-21 収穫可能。" }] },
      { text: "。", cites: [] },
    ]);
  });

  it("複数の要素にまたがる引用は範囲のまま残す", () => {
    const [block] = toHandoverBlocks([{ type: "text", text: "写真と判断", citations: [cite(0, 3, "三つ")] }], 3);
    expect(block.cites).toStrictEqual([{ start: 0, end: 3, citedText: "三つ" }]);
  });

  it("1 つのブロックの複数の引用は、返事の順のまま全部残す", () => {
    const [block] = toHandoverBlocks(
      [{ type: "text", text: "二つの根拠", citations: [cite(2, 3, "後"), cite(0, 1, "前")] }],
      3,
    );
    expect(block.cites).toStrictEqual([
      { start: 2, end: 3, citedText: "後" },
      { start: 0, end: 1, citedText: "前" },
    ]);
  });

  it("引用の無いブロック（citations が無い・null・空）は cites が空", () => {
    const blocks = toHandoverBlocks(
      [
        { type: "text", text: "一" },
        { type: "text", text: "二", citations: null },
        { type: "text", text: "三", citations: [] },
      ],
      1,
    );
    expect(blocks).toStrictEqual([
      { text: "一", cites: [] },
      { text: "二", cites: [] },
      { text: "三", cites: [] },
    ]);
  });

  it("引用から写すのは start・end・citedText だけ（文書の名前などは持たない）", () => {
    const [block] = toHandoverBlocks([{ type: "text", text: "x", citations: [cite(0, 1, "c", { extra: "y" })] }], 1);
    expect(Object.keys(block.cites[0]).sort()).toStrictEqual(["citedText", "end", "start"]);
    expect(Object.keys(block).sort()).toStrictEqual(["cites", "text"]);
  });
});

describe("toHandoverBlocks: 捨てる引用（T28）", () => {
  it("範囲外の番号（end が要素の数を超える・start が負・start が end 以上）は捨てる", () => {
    const [block] = toHandoverBlocks(
      [
        {
          type: "text",
          text: "x",
          citations: [cite(2, 4), cite(-1, 1), cite(2, 2), cite(3, 1), cite(3, 4), cite(0, 3, "端は含む")],
        },
      ],
      3,
    );
    expect(block.cites).toStrictEqual([{ start: 0, end: 3, citedText: "端は含む" }]);
  });

  it("番号が整数でない・数でないものは捨てる", () => {
    const [block] = toHandoverBlocks(
      [
        {
          type: "text",
          text: "x",
          citations: [
            cite(0.5, 1),
            cite(0, 1.5),
            cite(0, 1, "文字列", { start_block_index: "0" }),
            cite(0, 1, "無い", { end_block_index: undefined }),
            cite(0, 1, "NaN", { start_block_index: Number.NaN }),
            cite(1, 2, "残る"),
          ],
        },
      ],
      3,
    );
    expect(block.cites).toStrictEqual([{ start: 1, end: 2, citedText: "残る" }]);
  });

  it("document_index が 0 以外の引用は捨てる（渡す文書は 1 つだけ）", () => {
    const [block] = toHandoverBlocks(
      [
        {
          type: "text",
          text: "x",
          citations: [cite(0, 1, "a", { document_index: 1 }), cite(0, 1, "b", { document_index: "0" }), cite(0, 1, "c")],
        },
      ],
      1,
    );
    expect(block.cites).toStrictEqual([{ start: 0, end: 1, citedText: "c" }]);
  });

  it("種類の違う引用（文字の位置・ページ・種類なし）は捨てる", () => {
    const [block] = toHandoverBlocks(
      [
        {
          type: "text",
          text: "x",
          citations: [
            { type: "char_location", cited_text: "a", document_index: 0, start_char_index: 0, end_char_index: 1 },
            { type: "page_location", cited_text: "b", document_index: 0, start_page_number: 1, end_page_number: 2 },
            cite(0, 1, "c", { type: undefined }),
            cite(0, 1, "d"),
          ],
        },
      ],
      1,
    );
    expect(block.cites).toStrictEqual([{ start: 0, end: 1, citedText: "d" }]);
  });

  it("cited_text が文字列でない引用・オブジェクトでない引用は捨てる", () => {
    const [block] = toHandoverBlocks(
      [{ type: "text", text: "x", citations: [cite(0, 1, "a", { cited_text: 1 }), null, "引用", 3, cite(0, 1, "b")] }],
      1,
    );
    expect(block.cites).toStrictEqual([{ start: 0, end: 1, citedText: "b" }]);
  });

  it("引用を全部捨てたブロックも cites が空で残る（文は消さない）", () => {
    const blocks = toHandoverBlocks([{ type: "text", text: "根拠の無い文", citations: [cite(5, 6)] }], 3);
    expect(blocks).toStrictEqual([{ text: "根拠の無い文", cites: [] }]);
  });

  it("要素の数は引数に従う（決め打ちしない）", () => {
    const content = [{ type: "text", text: "x", citations: [cite(0, 7)] }];
    expect(toHandoverBlocks(content, 7)[0].cites).toHaveLength(1);
    expect(toHandoverBlocks(content, 6)[0].cites).toHaveLength(0);
  });

  it("要素が 0 個ならどの引用も捨てる", () => {
    expect(toHandoverBlocks([{ type: "text", text: "x", citations: [cite(0, 1)] }], 0)).toStrictEqual([
      { text: "x", cites: [] },
    ]);
  });
});

describe("toHandoverBlocks: text 以外のブロック（T28）", () => {
  it("thinking などの text 以外のブロックは捨て、text の順を保つ", () => {
    const blocks = toHandoverBlocks(
      [
        { type: "thinking", thinking: "", signature: "s" },
        { type: "text", text: "前" },
        { type: "redacted_thinking", data: "d" },
        { type: "text", text: "後" },
      ],
      1,
    );
    expect(blocks.map((b) => b.text)).toStrictEqual(["前", "後"]);
  });
});

describe("toHandoverBlocks: 形の違う返事は例外（T30 で 502）（T28）", () => {
  it.each([
    ["配列でない", { type: "text", text: "x" }],
    ["null", null],
    ["文字列", "x"],
    ["空の配列", []],
    ["text のブロックが無い", [{ type: "thinking", thinking: "" }]],
    ["ブロックがオブジェクトでない", [{ type: "text", text: "x" }, "y"]],
    ["ブロックが null", [{ type: "text", text: "x" }, null]],
    ["text が文字列でない", [{ type: "text", text: 1 }]],
    ["text が無い", [{ type: "text" }]],
    ["citations が配列でない", [{ type: "text", text: "x", citations: { type: "content_block_location" } }]],
  ])("%s", (_name, content) => {
    expect(() => toHandoverBlocks(content, 3)).toThrow(/返事の形/);
  });

  it("type が無いブロックは形の違いとして例外", () => {
    expect(() => toHandoverBlocks([{ text: "x" }], 3)).toThrow(/返事の形/);
  });

  // 人の確認（T28 の GREEN の後）: type が無いブロックだけの返事は「text が無い」でも例外になり、type の検査を外しても通った
  it("正しい text のブロックと混ざっていても、type が文字列でないブロックがあれば例外", () => {
    expect(() => toHandoverBlocks([{ type: "text", text: "a" }, { text: "x" }], 3)).toThrow(/返事の形/);
    expect(() => toHandoverBlocks([{ type: "text", text: "a" }, { type: 1, text: "x" }], 3)).toThrow(/返事の形/);
  });
});

describe("toHandoverBlocks: 渡したものを変えない（T28）", () => {
  it("返事の配列と引用を書き換えない", () => {
    const content = [{ type: "text", text: "x", citations: [cite(5, 6), cite(0, 1)] }];
    const before = JSON.stringify(content);
    toHandoverBlocks(content, 1);
    expect(JSON.stringify(content)).toBe(before);
  });
});
