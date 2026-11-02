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
