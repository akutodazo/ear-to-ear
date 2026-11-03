import { execFileSync, spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir, userInfo } from "node:os";
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

async function start(extra: Record<string, string> = {}) {
  child?.kill();
  child = spawn("node", [SERVER], {
    env: {
      ...process.env,
      CAGE_ROOT: root,
      CAGE_ALLOW: "src/add.mjs",
      CAGE_LOG: `${root}.log`,
      CAGE_TEST: JSON.stringify(["-e", 'console.log("ran", process.env.CAGE_PROBE ?? "no-env")']),
      CAGE_CHECKS: JSON.stringify([{ name: "C1", argv: ["node", "-e", 'console.log("C1 ok")'] }]),
      CAGE_PROBE: SECRET,
      ...extra,
    },
  });
  lines = createInterface({ input: child.stdout })[Symbol.asyncIterator]();
  await rpc("initialize", { protocolVersion: "2025-06-18" });
}

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
  await start();
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
    const r = await call("write_file", { path: "docs/run/QUESTIONS.md", content: "process と書ける" });
    expect(r.isError).toBeFalsy();
    expect(existsSync(join(root, "docs/run/QUESTIONS.md"))).toBe(true);
  });
});

describe("report", () => {
  it("検査を自分で実行して REPORT-Txx.md に残し、Txx REPORT でコミットする", async () => {
    const r = await call("report", { task: "T99" });
    expect(r.content[0].text).toMatch(/C1 ok/);
    expect(readFileSync(join(root, "docs/run/REPORT-T99.md"), "utf8")).toMatch(/C1 ok/);
    expect(git("log", "-1", "--format=%s").trim()).toBe("T99 REPORT");
  });

  it("task の形が違うと拒否する", async () => {
    expect((await call("report", { task: "x; rm" })).isError).toBe(true);
  });
});

describe("レビューの指摘: 検査が空の report", () => {
  it("検査が0件なら REPORT を作らない", async () => {
    await start({ CAGE_CHECKS: "[]" });
    expect((await call("report", { task: "T99" })).isError).toBe(true);
    expect(git("log", "-1", "--format=%s").trim()).toBe("T99 RED");
  });
});

describe("レビューの指摘: 時間の上限", () => {
  it("止まらないテストを打ち切って FAILED を返す", async () => {
    await start({ CAGE_TEST: JSON.stringify(["-e", "while (true) {}"]), CAGE_TIMEOUT_MS: "500" });
    expect((await call("run_tests")).content[0].text).toMatch(/FAILED/);
  });

  it("起動できない検査でも原因が見える", async () => {
    await start({ CAGE_CHECKS: JSON.stringify([{ name: "C1", argv: ["no-such-command"] }]) });
    expect((await call("report", { task: "T99" })).content[0].text).toMatch(/no-such-command/);
  });
});

describe("レビューの指摘: REPORT と QUESTIONS", () => {
  it("REPORT.md は write_file で書けない", async () => {
    expect((await call("write_file", { path: "docs/run/REPORT.md", content: "偽" })).isError).toBe(true);
  });

  it("CAGE_ALLOW に REPORT.md があっても write_file で書けない", async () => {
    await start({ CAGE_ALLOW: "src/add.mjs,docs/run/REPORT.md" });
    expect((await call("write_file", { path: "docs/run/REPORT.md", content: "偽" })).isError).toBe(true);
  });

  it("QUESTIONS.md は書けるが、commit_green には入らない", async () => {
    await call("write_file", { path: "docs/run/QUESTIONS.md", content: "止まった" });
    await call("write_file", { path: "src/add.mjs", content: "export const a = 1;" });
    await call("commit_green", { message: "T99 GREEN: add" });
    expect(git("diff", "--name-only", "HEAD~1", "HEAD").trim()).toBe("src/add.mjs");
  });
});

// REPORT はパケットごと（PR #56）。手元のパスを伏せる（PR #47 のレビュー #5）。#65
describe("report の書き先と伏せ字", () => {
  it("REPORT-<task>.md だけをコミットし、REPORT.md は作らない", async () => {
    await call("report", { task: "T99" });
    expect(git("show", "--name-only", "--format=", "HEAD").trim()).toBe("docs/run/REPORT-T99.md");
    expect(existsSync(join(root, "docs/run/REPORT.md"))).toBe(false);
  });

  it("前の運転の REPORT は上書きしない", async () => {
    mkdirSync(join(root, "docs/run"), { recursive: true });
    writeFileSync(join(root, "docs/run/REPORT-T98.md"), "# T98 REPORT\n");
    git("add", "-A");
    git("commit", "-q", "-m", "T98 REPORT");
    await call("report", { task: "T99" });
    expect(readFileSync(join(root, "docs/run/REPORT-T98.md"), "utf8")).toBe("# T98 REPORT\n");
  });

  it.each(["docs/run/REPORT-T99.md", "docs/run/REPORT-T1.md", "docs/run/REPORT.md"])(
    "%s は CAGE_ALLOW にあっても write_file で書けず、commit_green にも入らない",
    async (path) => {
      await start({ CAGE_ALLOW: `src/add.mjs,${path}` });
      expect((await call("write_file", { path, content: "偽" })).isError).toBe(true);
      await call("write_file", { path: "src/add.mjs", content: "export const a = 1;" });
      await call("commit_green", { message: "T99 GREEN: add" });
      expect(git("diff", "--name-only", "HEAD~1", "HEAD").trim()).toBe("src/add.mjs");
    },
  );

  it("作業フォルダ・ホームのパス・ユーザー名と色の制御文字を、REPORT にも返事にも出さない", async () => {
    const print = [
      "console.log(process.cwd())",
      "console.log(process.cwd().replaceAll('\\', '/'))",
      "console.log(require('os').homedir())",
      "console.log('user=' + require('os').userInfo().username)",
      "console.log('\x1b[32mgreen\x1b[39m')",
    ].join(";");
    await start({ CAGE_CHECKS: JSON.stringify([{ name: "C1", argv: ["node", "-e", print] }]) });
    const r = await call("report", { task: "T99" });
    const report = readFileSync(join(root, "docs/run/REPORT-T99.md"), "utf8");
    for (const text of [report, r.content[0].text]) {
      expect(text).not.toContain(root);
      expect(text).not.toContain(root.replaceAll("\\", "/"));
      expect(text).not.toContain(homedir());
      expect(text.toLowerCase()).not.toContain(userInfo().username.toLowerCase());
      expect(text).not.toContain("\x1b[");
      expect(text).toContain("<作業フォルダ>");
      expect(text).toContain("green");
    }
  });

  it("作業フォルダの下のパスは <作業フォルダ>/… の形で残す（どのファイルかは分かる）", async () => {
    const print = "console.log(require('path').join(process.cwd(), 'src', 'add.mjs'))";
    await start({ CAGE_CHECKS: JSON.stringify([{ name: "C1", argv: ["node", "-e", print] }]) });
    await call("report", { task: "T99" });
    const report = readFileSync(join(root, "docs/run/REPORT-T99.md"), "utf8");
    expect(report).toMatch(/<作業フォルダ>[\/]src[\/]add\.mjs/);
  });
});
