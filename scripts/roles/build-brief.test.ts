import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const SCRIPT = resolve("scripts/roles/build-brief.mjs");
const HISTORY = "会話の経緯";

let base: string;
let repo: string;
let out: string;

function run(...args: string[]) {
  return spawnSync("node", [SCRIPT, ...args, "--out", out], { cwd: repo, encoding: "utf8" });
}

function listFiles(dir: string): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => relative(dir, join(e.parentPath, e.name)).replaceAll("\\", "/"))
    .filter((p) => !p.startsWith(".git/"))
    .sort();
}

beforeEach(() => {
  base = mkdtempSync(join(tmpdir(), "brief-"));
  repo = join(base, "repo");
  out = join(base, "out");
  mkdirSync(join(repo, "src/services"), { recursive: true });
  mkdirSync(join(repo, "src/types"));
  writeFileSync(join(repo, "src/services/a.ts"), "export function f() { return 41 + 1; }\n");
  writeFileSync(join(repo, "src/services/a.test.ts"), "// test\n");
  writeFileSync(join(repo, "src/types/index.ts"), "export type T = 1;\n");
  writeFileSync(join(repo, "src/config.ts"), "export const X = 1;\n");
  writeFileSync(join(repo, "AGENTS.md"), "# rules\n");
  writeFileSync(join(repo, "NOTES.md"), `${HISTORY}\n`);
  const git = (...a: string[]) => execFileSync("git", a, { cwd: repo });
  git("init", "-q", "-b", "trunk");
  git("config", "user.name", "t");
  git("config", "user.email", "t@example.invalid");
  git("add", "-A");
  git("commit", "-q", "-m", "x");
});

afterEach(() => {
  rmSync(base, { recursive: true, force: true });
});

describe("攻撃役", () => {
  it("テスト・空の実装・型・設定だけが渡る", () => {
    const r = run("attacker", "--impl", "src/services/a.ts", "--test", "src/services/a.test.ts");
    expect(r.status).toBe(0);
    expect(listFiles(join(out, "work"))).toEqual([
      "src/config.ts",
      "src/services/a.test.ts",
      "src/services/a.ts",
      "src/types/index.ts",
    ]);
  });

  it("本物の実装は渡らない", () => {
    run("attacker", "--impl", "src/services/a.ts", "--test", "src/services/a.test.ts");
    const impl = readFileSync(join(out, "work/src/services/a.ts"), "utf8");
    expect(impl).toMatch(/not implemented/);
    expect(impl).not.toMatch(/41 \+ 1/);
  });

  it("Git 管理外のファイルは渡せない", () => {
    const r = run("attacker", "--impl", "src/services/none.ts", "--test", "src/services/a.test.ts");
    expect(r.status).not.toBe(0);
    expect(existsSync(join(out, "work"))).toBe(false);
  });
});

describe("来年の委員役・人の役", () => {
  it("来年の委員役にはメモだけが渡る", () => {
    const memo = join(base, "memo.md");
    writeFileSync(memo, "A-01 は刈れる\n");
    expect(run("committee", "--memo", memo).status).toBe(0);
    expect(listFiles(join(out, "work"))).toEqual(["memo.md"]);
  });

  it("人の役には QUESTIONS だけが渡る", () => {
    const q = join(base, "QUESTIONS.md");
    writeFileSync(q, "止まった\n");
    expect(run("human", "--questions", q).status).toBe(0);
    expect(listFiles(join(out, "work"))).toEqual(["QUESTIONS.md"]);
  });
});
