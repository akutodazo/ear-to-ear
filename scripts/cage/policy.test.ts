import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { checkCommitMessage, checkPurity, checkWrite, cleanPath } from "./policy.mjs";

const ALLOW = new Set(["src/services/add.ts"]);

describe("書ける場所", () => {
  it("許可リストのファイルは書ける", () => {
    expect(checkWrite("src/services/add.ts", ALLOW)).toBe(true);
  });

  it("書き方が違っても同じファイルなら書ける", () => {
    expect(checkWrite("src\\services\\add.ts", ALLOW)).toBe(true);
    expect(checkWrite("./src/services/add.ts", ALLOW)).toBe(true);
  });

  it.each([
    "src/services/add.test.ts",
    "src/services/../services/add.test.ts",
    "SRC/SERVICES/ADD.TS",
    "../outside.txt",
    ".git/hooks/pre-commit",
    ".claude/settings.json",
    "AGENTS.md",
    "",
  ])("%s は書けない", (path) => {
    expect(checkWrite(path, ALLOW)).toBe(false);
  });

  it("文字列でないパスは書けない", () => {
    expect(checkWrite(3, ALLOW)).toBe(false);
    expect(checkWrite(null, ALLOW)).toBe(false);
  });

  it("cleanPath は区切りをそろえて ./ と ../ を畳む", () => {
    expect(cleanPath("a\\b\\..\\c.ts")).toBe("a/c.ts");
  });
});

describe("コミットのメッセージ", () => {
  it("Txx GREEN: で始まる1行は通る", () => {
    expect(checkCommitMessage("T02 GREEN: 実装")).toBe(true);
  });

  it.each(["push origin", "t02 green: x", "T02 GREEN:", "T02 GREEN: a\nb", ""])("%j は通らない", (m) => {
    expect(checkCommitMessage(m)).toBe(false);
  });
});
