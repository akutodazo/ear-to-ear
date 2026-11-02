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

describe("純粋関数の検査: import", () => {
  it.each([
    'import type { Field } from "@/types";',
    'import { MAX_CANDIDATES } from "@/config";',
    'import { x } from "@/services/other";',
    'import { x } from "./other";',
    'import { x } from "../config";',
    'import { x } from "../types";',
  ])("%s は通る", (code) => {
    expect(checkPurity(code)).toEqual([]);
  });

  it.each([
    'import { readFileSync } from "node:fs";',
    'import { execSync } from "child_process";',
    'import x from "leaflet";',
    'import "../../scripts/x";',
    'export { x } from "node:fs";',
    'const m = await import("./other");',
    'const m = require("./other");',
  ])("%s は通らない", (code) => {
    expect(checkPurity(code).length).toBeGreaterThan(0);
  });
});

describe("純粋関数の検査: 外に触る名前", () => {
  it.each([
    "process.env.X",
    'fetch("http://example.invalid")',
    'eval("1")',
    'new Function("return 1")',
    "globalThis.x",
    "global.x",
    "window.x",
    "self.x",
    'new WebSocket("ws://example.invalid")',
    'Reflect.get(a, "b")',
    "import.meta.url",
    "(() => 0).constructor",
    'a["constructor"]',
    "a.__proto__",
  ])("%s は通らない", (code) => {
    expect(checkPurity(code).length).toBeGreaterThan(0);
  });

  it("理由に名前が出る", () => {
    expect(checkPurity("process.exit(1)").join()).toMatch(/process/);
  });
});

describe("純粋関数の検査: 誤検出しない", () => {
  it.each([
    "// process や fetch はコメントなら書ける",
    'const s = "process を文字列で書ける";',
    "const a = { process: 1, fetch: 2 };",
    "const b = a.process + a.fetch;",
    "export function add(a: number, b: number) { return a + b; }",
    'const t = btoa("a") + new TextEncoder().encode("b").length;',
  ])("%s は通る", (code) => {
    expect(checkPurity(code)).toEqual([]);
  });
});

describe("いまの Service", () => {
  it.each(["src/services/jpeg-segments.ts", "src/services/session-token.ts"])("%s は検査を通る", (path) => {
    expect(checkPurity(readFileSync(path, "utf8"))).toEqual([]);
  });
});

describe("レビューの指摘: 許可リストの外へ抜ける import", () => {
  it.each([
    'import s from "./../../.dev.vars?raw";',
    'import s from "./.dev.vars";',
    'import s from "./x?raw";',
    'import s from "@/services/../../scripts/x";',
    'import fs = require("node:fs");',
  ])("%s は通らない", (code) => {
    expect(checkPurity(code).length).toBeGreaterThan(0);
  });
});

describe("レビューの指摘: 文字列のキーとブラウザ API", () => {
  it.each([
    'const { "constructor": F } = () => 0;',
    "const { constructor: F } = () => 0;",
    'localStorage.getItem("a")',
    "sessionStorage.clear()",
    "navigator.userAgent",
    "crypto.subtle",
    "location.href",
    "indexedDB.open",
  ])("%s は通らない", (code) => {
    expect(checkPurity(code).length).toBeGreaterThan(0);
  });
});

describe("レビューの指摘: 正しいコードを拒否しない", () => {
  it.each([
    "function f(document: string) { return document; }",
    "function g(fetch: () => void) { fetch(); }",
    "const process = 1; export const y = process + 1;",
    "interface X { document: string; fetch(): void }",
    "class A { process() {} fetch = 1; }",
    "const { process: p } = { process: 1 };",
  ])("%s は通る", (code) => {
    expect(checkPurity(code)).toEqual([]);
  });
});
