// 無人の Claude に渡す道具（#14）。依存なし、stdio の改行区切り JSON-RPC。使い方は docs/dev/cage.md
import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline";
import { checkCommitMessage, checkPurity, checkWrite, cleanPath } from "./policy.mjs";

const ROOT = process.env.CAGE_ROOT;
const ALLOW = new Set(process.env.CAGE_ALLOW.split(","));
const LOG = process.env.CAGE_LOG;
const TEST_ARGS = JSON.parse(process.env.CAGE_TEST ?? '["node_modules/vitest/vitest.mjs","run"]');
const CHECKS = JSON.parse(process.env.CAGE_CHECKS ?? "[]");
const REPORT = "docs/run/REPORT.md";

// テストは Claude が書いたコードを実行するので、檻の環境変数も秘密も渡さない
const CHILD_ENV = Object.fromEntries(
  ["PATH", "Path", "SystemRoot", "TEMP", "TMP", "HOME", "USERPROFILE"]
    .filter((k) => process.env[k] !== undefined)
    .map((k) => [k, process.env[k]]),
);

const git = (...args) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8" });
const tracked = () => new Set(git("ls-files").split("\n").filter(Boolean));

function runChild(file, args) {
  try {
    return execFileSync(file, args, { cwd: ROOT, env: CHILD_ENV, encoding: "utf8", stdio: "pipe" });
  } catch (e) {
    return `FAILED\n${e.stdout}\n${e.stderr}`;
  }
}

const tools = {
  read_file: {
    description: "Git で管理されたファイルを読む",
    schema: { path: { type: "string" } },
    run: ({ path }) => {
      const p = cleanPath(path);
      if (!tracked().has(p) && !(ALLOW.has(p) && existsSync(join(ROOT, p)))) throw new Error(`拒否: Git 管理外 ${p}`);
      return readFileSync(join(ROOT, p), "utf8");
    },
  },
  write_file: {
    description: "許可されたファイルを書く。コードは純粋関数の検査を通す",
    schema: { path: { type: "string" }, content: { type: "string" } },
    run: ({ path, content }) => {
      if (!checkWrite(path, ALLOW)) throw new Error(`拒否: 許可リスト外 ${path}`);
      const p = cleanPath(path);
      if (/\.(ts|tsx|js|mjs)$/.test(p)) {
        const problems = checkPurity(content);
        if (problems.length > 0) throw new Error(`拒否: 純粋関数の検査 ${problems.join(", ")}`);
      }
      mkdirSync(dirname(join(ROOT, p)), { recursive: true });
      writeFileSync(join(ROOT, p), content);
      return `wrote ${p}`;
    },
  },
  run_tests: {
    description: "対象のテストを実行する",
    schema: {},
    run: () => runChild("node", TEST_ARGS),
  },
  commit_green: {
    description: "許可されたファイルだけをコミットする",
    schema: { message: { type: "string" } },
    run: ({ message }) => {
      if (!checkCommitMessage(message)) throw new Error("拒否: メッセージは 'Txx GREEN: ' で始める1行");
      const paths = [...ALLOW].filter((p) => existsSync(join(ROOT, p)));
      git("add", "--", ...paths);
      git("commit", "-m", message, "--", ...paths);
      return git("log", "--oneline", "-1");
    },
  },
  report: {
    description: "検査を1回ずつ実行して REPORT.md に残し、コミットする",
    schema: { task: { type: "string" } },
    run: ({ task }) => {
      if (!/^T\d+$/.test(task)) throw new Error("拒否: task は Txx の形");
      const body = CHECKS.map((c) => `## ${c.name}\n\`\`\`\n${runChild(c.argv[0], c.argv.slice(1))}\n\`\`\`\n`).join("\n");
      mkdirSync(join(ROOT, dirname(REPORT)), { recursive: true });
      writeFileSync(join(ROOT, REPORT), `# ${task} REPORT（検査済み・人の確認待ち）\n\n${body}`);
      git("add", "--", REPORT);
      git("commit", "-m", `${task} REPORT`, "--", REPORT);
      return body;
    },
  },
};

const send = (id, result) => process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id, result })}\n`);

for await (const line of createInterface({ input: process.stdin })) {
  if (!line.trim()) continue;
  const { id, method, params } = JSON.parse(line);
  if (method === "initialize") {
    send(id, {
      protocolVersion: params.protocolVersion,
      capabilities: { tools: {} },
      serverInfo: { name: "cage", version: "0.1.0" },
    });
  } else if (method === "tools/list") {
    send(id, {
      tools: Object.entries(tools).map(([name, t]) => ({
        name,
        description: t.description,
        inputSchema: { type: "object", properties: t.schema, required: Object.keys(t.schema) },
      })),
    });
  } else if (method === "tools/call") {
    const { name, arguments: args } = params;
    appendFileSync(LOG, `${JSON.stringify({ name, args })}\n`);
    try {
      if (!Object.hasOwn(tools, name)) throw new Error(`拒否: 道具が無い ${name}`);
      send(id, { content: [{ type: "text", text: tools[name].run(args ?? {}) }] });
    } catch (e) {
      send(id, { content: [{ type: "text", text: e.message }], isError: true });
    }
  } else if (id !== undefined) {
    send(id, {});
  }
}
