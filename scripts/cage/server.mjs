// 無人の Claude に渡す道具（#14）。依存なし、stdio の改行区切り JSON-RPC。使い方は docs/dev/cage.md
import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir, userInfo } from "node:os";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline";
import { checkCommitMessage, checkPurity, checkWrite, cleanPath } from "./policy.mjs";

const ROOT = process.env.CAGE_ROOT;
// REPORT はパケットごと（docs/run/REPORT-Txx.md、PR #56）
const reportPath = (task) => `docs/run/REPORT-${task}.md`;
const IS_REPORT = /^docs\/run\/REPORT(-T\d+)?\.md$/;
const QUESTIONS = "docs/run/QUESTIONS.md";
// REPORT は report だけが書く（どの番号も）。QUESTIONS は止まるときに書き、コミットはしない（AGENTS.md §5）
const COMMITTABLE = process.env.CAGE_ALLOW.split(",").filter((p) => !IS_REPORT.test(cleanPath(p)) && p !== QUESTIONS);
const ALLOW = new Set([...COMMITTABLE, QUESTIONS]);
const LOG = process.env.CAGE_LOG;
const TEST_ARGS = JSON.parse(process.env.CAGE_TEST ?? '["node_modules/vitest/vitest.mjs","run"]');
const CHECKS = JSON.parse(process.env.CAGE_CHECKS ?? "[]");
const TIMEOUT_MS = Number(process.env.CAGE_TIMEOUT_MS ?? 120_000);

// テストは Claude が書いたコードを実行するので、檻の環境変数も秘密も渡さない
const CHILD_ENV = Object.fromEntries(
  ["PATH", "Path", "SystemRoot", "TEMP", "TMP", "HOME", "USERPROFILE"]
    .filter((k) => process.env[k] !== undefined)
    .map((k) => [k, process.env[k]]),
);

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** パスを / と \ のどちらで書いても、大文字小文字が違っても当たる */
const pathPattern = (path) => new RegExp(path.split(/[\\/]/).map(escapeRegExp).join("[\\\\/]"), "gi");
const USER = userInfo().username;

/**
 * REPORT と返事から手元の情報を伏せる（PR #47 のレビュー #5）。色の制御文字も消す。
 * 作業フォルダ → ホーム → ユーザー名の順（長いものから）。ユーザー名は折り返しで切れたパスの残りも拾う
 */
function mask(text) {
  let out = text.replace(/\x1b\[[0-9;]*[A-Za-z]/g, "");
  out = out.replace(pathPattern(ROOT), "<作業フォルダ>");
  out = out.replace(pathPattern(homedir()), "<ホーム>");
  if (USER.length >= 3) out = out.replace(new RegExp(escapeRegExp(USER), "gi"), "<ユーザー>");
  return out;
}

const git = (...args) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8" });
const tracked = () => new Set(git("ls-files", "-z").split("\0").filter(Boolean));

function runChild(file, args) {
  try {
    return execFileSync(file, args, { cwd: ROOT, env: CHILD_ENV, encoding: "utf8", stdio: "pipe", timeout: TIMEOUT_MS });
  } catch (e) {
    return `FAILED\n${e.message}\n${e.stdout}\n${e.stderr}`;
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
      if (/\.[cm]?[jt]sx?$/.test(p)) {
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
      const paths = COMMITTABLE.filter((p) => existsSync(join(ROOT, p)));
      git("add", "--", ...paths);
      git("commit", "-m", message, "--", ...paths);
      return git("log", "--oneline", "-1");
    },
  },
  report: {
    description: "検査を1回ずつ実行して REPORT-Txx.md に残し、コミットする（手元のパスは伏せる）",
    schema: { task: { type: "string" } },
    run: ({ task }) => {
      if (!/^T\d+$/.test(task)) throw new Error("拒否: task は Txx の形");
      if (CHECKS.length === 0) throw new Error("拒否: 検査が0件（CAGE_CHECKS）");
      const body = mask(
        CHECKS.map((c) => `## ${c.name}\n\`\`\`\n${runChild(c.argv[0], c.argv.slice(1))}\n\`\`\`\n`).join("\n"),
      );
      const report = reportPath(task);
      mkdirSync(join(ROOT, dirname(report)), { recursive: true });
      writeFileSync(join(ROOT, report), `# ${task} REPORT（検査済み・人の確認待ち）\n\n${body}`);
      git("add", "--", report);
      git("commit", "-m", `${task} REPORT`, "--", report);
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
