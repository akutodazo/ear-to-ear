// みっきぃ 8（#221）: 「メモを作る（管理者）」が括弧の中で折れる。短い括弧の中は 1 つの塊にして、折るなら括弧の前で折る（純粋関数）
import { describe, expect, it } from "vitest";
import { PAREN_KEEP_MAX_CHARS, phrasesKeepingParens } from "./paren-phrases";

describe("phrasesKeepingParens", () => {
  it("ボタンの（管理者）は 1 つの塊", () => {
    const phrases = phrasesKeepingParens("メモを作る（管理者）");
    expect(phrases).toContain("（管理者）");
    expect(phrases.join("")).toBe("メモを作る（管理者）");
  });

  it("作った日時の（Claude が記録から作成）も 1 つの塊", () => {
    const phrases = phrasesKeepingParens("11/6 13:30 に作成（Claude が記録から作成）");
    expect(phrases.at(-1)).toBe("（Claude が記録から作成）");
    expect(phrases.join("")).toBe("11/6 13:30 に作成（Claude が記録から作成）");
  });

  it("閉じ括弧の後ろに続く語は、括弧の塊に付けない（括弧の後で折れる）", () => {
    const phrases = phrasesKeepingParens("（管理者）だけが作れます");
    expect(phrases[0]).toBe("（管理者）");
    expect(phrases.join("")).toBe("（管理者）だけが作れます");
  });

  it(`長い括弧（${PAREN_KEEP_MAX_CHARS} 字を超える）は今までどおり中で折ってよい`, () => {
    const text = "候補: なし（位置が取れない写真は、管理者があとで番号を付けます）";
    const phrases = phrasesKeepingParens(text);
    expect(phrases.join("")).toBe(text);
    expect(phrases.some((p) => p.startsWith("（") && p.endsWith("）"))).toBe(false);
  });

  it("括弧が閉じていなければ、まとめない（文字を失わない）", () => {
    const text = "メモを作る（管理者";
    expect(phrasesKeepingParens(text).join("")).toBe(text);
  });

  it("括弧が無ければ splitIntoPhrases と同じ", () => {
    expect(phrasesKeepingParens("3枚送りました")).toEqual(["3枚", "送りました"]);
  });

  it("空の文は塊なし", () => {
    expect(phrasesKeepingParens("")).toEqual([]);
  });
});
