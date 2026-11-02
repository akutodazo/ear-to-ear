import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { classifyRun, prepareRun, tableOf } from "./rule-ab-lib.mjs";

const dirs: string[] = [];

function prepared(fixture: string, rule: string) {
  const dir = join(mkdtempSync(join(tmpdir(), "ab-")), "work");
  dirs.push(dir);
  prepareRun({ fixture, rule, dir });
  return dir;
}

afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(join(d, ".."), { recursive: true, force: true });
});

describe("条件", () => {
  it("2通りの違いは決まりのファイルの有無だけ", () => {
    const withRule = prepared("contradict", "with");
    const without = prepared("contradict", "without");
    const list = (d: string) => readdirSync(d).filter((f) => f !== ".git").sort();
    expect(list(withRule).filter((f) => !list(without).includes(f))).toEqual(["CLAUDE.md"]);
    expect(list(without).filter((f) => !list(withRule).includes(f))).toEqual([]);
  });

  it("決まりの無い方は .claude も CLAUDE.md も置かない", () => {
    expect(readdirSync(prepared("normal", "without"))).not.toContain(".claude");
    expect(readdirSync(prepared("normal", "without"))).not.toContain("CLAUDE.md");
  });

  it("用意した直後はコミット済みで差分が無い", () => {
    const dir = prepared("normal", "with");
    expect(execFileSync("git", ["status", "--porcelain"], { cwd: dir, encoding: "utf8" })).toBe("");
  });
});
