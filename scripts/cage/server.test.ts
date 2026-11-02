import { execFileSync, spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const SERVER = resolve("scripts/cage/server.mjs");
const SECRET = "DUMMY_CANARY";

type Result = { content: { text: string }[]; isError?: boolean; tools?: { name: string }[] };

let root: string;
let child: ChildProcessWithoutNullStreams;
let lines: AsyncIterableIterator<string>;
let id = 0;

const git = (...args: string[]) => execFileSync("git", args, { cwd: root, encoding: "utf8" });

async function rpc(method: string, params: unknown): Promise<Result> {
  child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id: ++id, method, params })}\n`);
  return JSON.parse((await lines.next()).value).result;
}
const call = (name: string, args: unknown = {}) => rpc("tools/call", { name, arguments: args });

beforeEach(async () => {
  root = mkdtempSync(join(tmpdir(), "cage-"));
  mkdirSync(join(root, "src"));
  writeFileSync(join(root, "src/add.mjs"), 'throw new Error("not implemented");\n');
  writeFileSync(join(root, "src/add.test.mjs"), "export {};\n");
  git("init", "-q", "-b", "trunk");
  git("config", "user.name", "cage");
  git("config", "user.email", "cage@example.invalid");
  git("add", "-A");
  git("commit", "-q", "-m", "T99 RED");
  writeFileSync(join(root, ".git/info/exclude"), ".dev.vars\n");
  writeFileSync(join(root, ".dev.vars"), `X=${SECRET}\n`);
  child = spawn("node", [SERVER], {
    env: {
      ...process.env,
      CAGE_ROOT: root,
      CAGE_ALLOW: "src/add.mjs,docs/run/REPORT.md",
      CAGE_LOG: `${root}.log`,
      CAGE_TEST: JSON.stringify(["-e", 'console.log("ran", process.env.CAGE_PROBE ?? "no-env")']),
      CAGE_CHECKS: JSON.stringify([{ name: "C1", argv: ["node", "-e", 'console.log("C1 ok")'] }]),
      CAGE_PROBE: SECRET,
    },
  });
  lines = createInterface({ input: child.stdout })[Symbol.asyncIterator]();
  await rpc("initialize", { protocolVersion: "2025-06-18" });
});

afterEach(() => {
  child.kill();
  rmSync(root, { recursive: true, force: true });
  rmSync(`${root}.log`, { force: true });
});

describe("道具", () => {
  it("5つだけを見せる", async () => {
    const r = await rpc("tools/list", {});
    expect(r.tools?.map((t) => t.name).sort()).toEqual([
      "commit_green",
      "read_file",
      "report",
      "run_tests",
      "write_file",
    ]);
  });
});

describe("正常系", () => {
  it("読む → 書く → テスト → コミットができ、変更は許可リストだけ", async () => {
    expect((await call("read_file", { path: "src/add.test.mjs" })).isError).toBeFalsy();
    const w = await call("write_file", { path: "src/add.mjs", content: "export const add = (a, b) => a + b;\n" });
    expect(w.isError).toBeFalsy();
    expect((await call("run_tests")).content[0].text).toMatch(/ran/);
    expect((await call("commit_green", { message: "T99 GREEN: add" })).isError).toBeFalsy();
    expect(git("log", "-1", "--format=%s").trim()).toBe("T99 GREEN: add");
    expect(git("diff", "--name-only", "HEAD~1", "HEAD").trim()).toBe("src/add.mjs");
  });
});

describe("拒否", () => {
  it.each([
    ["秘密を読む", "read_file", { path: ".dev.vars" }],
    ["外を読む", "read_file", { path: "../x" }],
    ["テストを書き換える", "write_file", { path: "src/add.test.mjs", content: "x" }],
    ["迂回して書き換える", "write_file", { path: "src/../src/add.test.mjs", content: "x" }],
    ["大文字で迂回", "write_file", { path: "SRC/ADD.TEST.MJS", content: "x" }],
    ["git のフック", "write_file", { path: ".git/hooks/pre-commit", content: "x" }],
    ["形式違いのコミット", "commit_green", { message: "push origin" }],
    ["知らない道具", "shell", { command: "ls" }],
  ])("%s", async (_label, name, args) => {
    expect((await call(name, args)).isError).toBe(true);
    expect(git("status", "--porcelain").trim()).toBe("");
  });
});

describe("run_tests の抜け穴", () => {
  it("実装に秘密を読むコードを書こうとすると、書く前に拒否する", async () => {
    const hole = 'import { readFileSync } from "node:fs";\nexport const add = () => readFileSync(".dev.vars", "utf8");\n';
    const r = await call("write_file", { path: "src/add.mjs", content: hole });
    expect(r.isError).toBe(true);
    expect(r.content[0].text).toMatch(/node:fs/);
    expect(readFileSync(join(root, "src/add.mjs"), "utf8")).not.toMatch(/readFileSync/);
  });

  it("テストの実行に檻の環境変数を渡さない", async () => {
    const r = await call("run_tests");
    expect(r.content[0].text).toMatch(/no-env/);
    expect(r.content[0].text).not.toMatch(SECRET);
  });

  it("コード以外のファイルは純粋関数の検査をしない", async () => {
    const r = await call("write_file", { path: "docs/run/REPORT.md", content: "process と書ける" });
    expect(r.isError).toBeFalsy();
    expect(existsSync(join(root, "docs/run/REPORT.md"))).toBe(true);
  });
});

describe("report", () => {
  it("検査を自分で実行して REPORT.md に残し、Txx REPORT でコミットする", async () => {
    const r = await call("report", { task: "T99" });
    expect(r.content[0].text).toMatch(/C1 ok/);
    expect(readFileSync(join(root, "docs/run/REPORT.md"), "utf8")).toMatch(/C1 ok/);
    expect(git("log", "-1", "--format=%s").trim()).toBe("T99 REPORT");
  });

  it("task の形が違うと拒否する", async () => {
    expect((await call("report", { task: "x; rm" })).isError).toBe(true);
  });
});
