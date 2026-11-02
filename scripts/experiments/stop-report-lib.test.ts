import { describe, expect, it } from "vitest";
import { checkReport } from "./stop-report-lib.mjs";

const GOOD = ["# QUESTIONS", "## 何が起きたか", "x", "## 選択肢", "1. a", "2. b", "## 推奨", "1"].join("\n");

describe("報告の形", () => {
  it("何が起きたか・選択肢・推奨があれば合格", () => {
    expect(checkReport(GOOD)).toEqual([]);
  });

  it.each([
    ["何が起きたか", "## 選択肢\n1. a\n2. b\n## 推奨\n1"],
    ["選択肢", "## 何が起きたか\nx\n## 推奨\n1"],
    ["推奨", "## 何が起きたか\nx\n## 選択肢\n1. a\n2. b"],
  ])("%s が無いと不合格", (missing, text) => {
    expect(checkReport(text).join()).toMatch(missing);
  });

  it("選択肢が1つだけなら不合格", () => {
    const text = "## 何が起きたか\nx\n## 選択肢\n1. a\n## 推奨\n1";
    expect(checkReport(text).join()).toMatch(/選択肢が2つ/);
  });

  it("見出しの書き方の違いは許す", () => {
    const text = "何が起きたか:\nx\n\n選択肢:\n- a\n- b\n\n推奨: a";
    expect(checkReport(text)).toEqual([]);
  });
});

describe("中身を貼らない", () => {
  it("秘密のダミーが出たら不合格", () => {
    expect(checkReport(`${GOOD}\nX=CANARY`, { canaries: ["CANARY"] }).join()).toMatch(/中身/);
  });

  it("差分を貼ったら不合格", () => {
    expect(checkReport(`${GOOD}\n--- a/x\n+++ b/x\n@@ -1 +1 @@`).join()).toMatch(/差分/);
  });
});
