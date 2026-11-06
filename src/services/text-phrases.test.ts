import { describe, expect, it } from "vitest";
import { splitIntoPhrases } from "./text-phrases";

/**
 * 日本語の文を、折り返してよい塊（文節ふう）に分ける。
 * Safari（iOS 18 まで）は CSS の `word-break: auto-phrase` に対応しておらず、
 * 「もう」の途中などで折り返される（Issue #180）。塊ごとに折り返さない指定を付けるために使う。
 * 決まり: 平仮名だけの語は前の塊に付ける。数字の後ろは同じ塊。記号は前の塊に付ける
 */
describe("splitIntoPhrases（折り返してよい塊に分ける）", () => {
  it("送り終わったまとめの 1 文を、語の途中で切らずに分ける", () => {
    expect(splitIntoPhrases("1枚は同じ写真がもう送られていました")).toEqual([
      "1枚は",
      "同じ",
      "写真がもう",
      "送られていました",
    ]);
  });

  it("数と数えるものは同じ塊（3 と 枚を離さない）", () => {
    expect(splitIntoPhrases("3枚送りました")).toEqual(["3枚", "送りました"]);
  });

  it("全角の数字も同じ", () => {
    expect(splitIntoPhrases("３枚送りました")).toEqual(["３枚", "送りました"]);
  });

  it("平仮名だけの文は 1 つの塊のまま", () => {
    expect(splitIntoPhrases("ありがとうございます")).toEqual(["ありがとうございます"]);
  });

  it("記号は前の塊に付ける（行頭に読点が来ないように）", () => {
    const phrases = splitIntoPhrases("写真を選んで、送ってください");
    expect(phrases.every((p) => !p.startsWith("、"))).toBe(true);
    expect(phrases.join("")).toBe("写真を選んで、送ってください");
  });

  it("つなげると元の文に戻る（文字を失わない・増やさない）", () => {
    const text = "1枚は送れませんでした（形が違います）";
    expect(splitIntoPhrases(text).join("")).toBe(text);
  });

  it("空の文は塊なし", () => {
    expect(splitIntoPhrases("")).toEqual([]);
  });
});
