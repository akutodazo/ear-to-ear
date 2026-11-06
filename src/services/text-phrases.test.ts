import { describe, expect, it } from "vitest";
import { splitIntoPhrases } from "./text-phrases";

/**
 * 日本語の文を、折り返してよい塊（文節ふう）に分ける。
 * Safari（iOS 18 まで）は CSS の `word-break: auto-phrase` に対応しておらず、
 * 「もう」の途中などで折り返される（Issue #180）。塊ごとに折り返さない指定を付けるために使う。
 * 決まり: 平仮名だけの語は前の塊に付ける。数字の後ろは同じ塊。記号は前の塊に付ける。
 * ただし開き括弧は後ろの塊に付ける。英数字とハイフンの並び（圃場番号 A-03 など）は分けない（11-06 の攻撃役の指摘）
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

  // 11-06 の攻撃役（docs/dev/test-attack.md）: 例文の答えを表に書くだけで通ったので、表に無い文と性質を足す
  it.each([
    ["5冊読みました", ["5冊", "読みました"]],
    ["12枚送りました", ["12枚", "送りました"]],
    ["根拠の写真を選んでください", ["根拠の", "写真を", "選んでください"]],
    ["写真を選んで、送ってください", ["写真を", "選んで、", "送ってください"]],
  ])("表に無い文も分ける: %s", (text, phrases) => {
    expect(splitIntoPhrases(text)).toEqual(phrases);
  });

  it("圃場番号（英数字とハイフン）は途中で分けない", () => {
    expect(splitIntoPhrases("A-03 に決めました")).toEqual(["A-03 に", "決めました"]);
    expect(splitIntoPhrases("A-11 と A-12")).toEqual(["A-11 と", "A-12"]);
  });

  it("開き括弧は後ろの塊に付け、閉じ括弧は前の塊に付ける", () => {
    expect(splitIntoPhrases("1枚は送れませんでした（形が違います）")).toEqual([
      "1枚は",
      "送れませんでした",
      "（形が",
      "違います）",
    ]);
    expect(splitIntoPhrases("「収穫可能」と判断")).toEqual(["「収穫可能」と", "判断"]);
  });

  const SAMPLES = [
    "1枚は同じ写真がもう送られていました",
    "3枚送りました。1枚は送れませんでした（形が違います）",
    "A-03 北の3 を「目安」にしました、確かめてください。",
    "ありがとうございます",
    "メモを200字まで書けます",
    "、。",
    "（",
  ];

  it.each(SAMPLES)("性質: つなげると元に戻り、空の塊が無い（%s）", (text) => {
    const phrases = splitIntoPhrases(text);
    expect(phrases.join("")).toBe(text);
    expect(phrases.every((p) => p.length > 0)).toBe(true);
  });

  it.each(SAMPLES.filter((t) => t.length > 1))("性質: 2 つ目以降の塊は句読点・閉じ括弧で始まらず、最後以外の塊は開き括弧で終わらない（%s）", (text) => {
    const phrases = splitIntoPhrases(text);
    expect(phrases.slice(1).every((p) => !/^[、。，．）」』】〕)\]]/.test(p))).toBe(true);
    expect(phrases.slice(0, -1).every((p) => !/[（「『【〔(\[]$/.test(p))).toBe(true);
  });
});
