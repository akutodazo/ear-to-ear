import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { stubImpl } from "./stub-impl.mjs";

describe("空の実装を作る", () => {
  it("export した関数の中身を not implemented に置き換える", () => {
    const out = stubImpl("export function add(a: number, b: number): number {\n  return a + b;\n}\n");
    expect(out).toMatch(/export function add\(a: number, b: number\): number/);
    expect(out).toMatch(/not implemented/);
    expect(out).not.toMatch(/a \+ b/);
  });

  it("async の関数も形を保つ", () => {
    const out = stubImpl("export async function f(): Promise<number> { return 1; }");
    expect(out).toMatch(/export async function f\(\): Promise<number>/);
    expect(out).not.toMatch(/return 1/);
  });
});

describe("残すものと消すもの", () => {
  it("import・型・export したクラスは残す", () => {
    const src = [
      'import type { Role } from "@/types";',
      "export type T = Role;",
      "export interface I { a: number }",
      "export class E extends Error {}",
    ].join("\n");
    const out = stubImpl(src);
    for (const line of src.split("\n")) expect(out).toContain(line);
  });

  it("export していない補助の関数と定数は消す", () => {
    const out = stubImpl('const SECRET_LOGIC = 1;\nfunction helper() { return SECRET_LOGIC; }\nexport function f() { return helper(); }\n');
    expect(out).not.toMatch(/SECRET_LOGIC|helper/);
  });
});

describe("いまの Service", () => {
  it("session-token の実装が空の実装に出ない", () => {
    const out = stubImpl(readFileSync("src/services/session-token.ts", "utf8"));
    expect(out).toMatch(/export (async )?function issueSessionToken/);
    expect(out).toMatch(/export (async )?function verifySessionToken/);
    expect(out).not.toMatch(/atob|btoa|BASE64URL/);
  });
});
