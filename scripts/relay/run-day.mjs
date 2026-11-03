// 檻リレーの進行役（ハーネス v0.6、docs/dev/harness-v0.6-relay.md §2・§3）。LLM を呼ばない。
// 待ち行列のパケットを 1 本ずつ檻の `claude -p` で回し、ゲートで合否を決める。止まったパケットは再開せず、残りを続ける。
// push・PR・gh・wrangler・npm install をしない（worktree の npm ci は --prepare のときだけ、人が起動する）。
//
//   node scripts/relay/run-day.mjs --today 1104 --prepare   … 朝に人が。worktree を作り npm ci
//   node scripts/relay/run-day.mjs --today 1104             … 列車を走らせる（通知係が背景で起動）
//   node scripts/relay/run-day.mjs --today 1104 --skip T22  … T22 を飛ばして新しい列車（再開ではない）
import { execFileSync, spawn } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { homedir, userInfo } from "node:os";
import { dirname, join } from "node:path";
import { findSecretLikeLines } from "../safety-rules.ts";
import { alive, CAGE_SERVER, CLAUDE, NPM_CLI, paths, readJson, REPO, TREES } from "./paths.mjs";
import {
  cageEnv,
  costFromStream,
  isRunning,
  isUnknownFailure,
  ledgerTotal,
  mask,
  parseRunDayArgs,
  postGates,
  preStartGate,
  statusLine,
  validateQueue,
} from "./relay-lib.ts";

const git = (cwd, ...args) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const tryGit = (cwd, ...args) => {
  try {
    return git(cwd, ...args);
  } catch {
    return null;
  }
};
const write = (path, text) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
};
const where = (root) => ({ root, home: homedir(), user: userInfo().username });

/** 子の claude に渡す環境変数。秘密を渡さない（檻の CHILD_ENV ＋ 認証の置き場を探すのに要るもの） */
const CHILD_ENV = Object.fromEntries(
  ["PATH", "Path", "SystemRoot", "TEMP", "TMP", "HOME", "USERPROFILE", "APPDATA", "LOCALAPPDATA", "USERNAME"]
    .filter((k) => process.env[k] !== undefined)
    .map((k) => [k, process.env[k]]),
);

function loadQueue(p) {
  const raw = readJson(p.queue, null);
  const result = validateQueue(raw);
  if (!result.ok) {
    console.error(`待ち行列が不正（列車を起動しない）:\n- ${result.errors.join("\n- ")}`);
    process.exit(2);
  }
  return result.queue;
}

function prepare(queue) {
  git(REPO, "config", "extensions.worktreeConfig", "true");
  for (const packet of queue.packets) {
    const tree = join(TREES, packet.id);
    if (existsSync(tree)) {
      console.log(`${packet.id}: worktree はある`);
      continue;
    }
    mkdirSync(TREES, { recursive: true });
    git(REPO, "worktree", "add", "--detach", tree, "main");
    // この worktree からは push できない（本体の push は止めない）
    git(tree, "config", "--worktree", "remote.origin.pushurl", "no_push");
    console.log(`${packet.id}: npm ci（lockfile どおり。junction にしない、T04）`);
    execFileSync(process.execPath, [NPM_CLI, "ci", "--prefer-offline", "--no-audit", "--no-fund"], { cwd: tree, stdio: "inherit" });
  }
}

/** 使用量（通知係が usage.mjs で書く）。3 時間より古ければ読めないものとする */
function readUsage(p) {
  const u = readJson(p.usage, null);
  const fresh = u && typeof u.readAt === "string" && Date.now() - Date.parse(u.readAt) < 3 * 3600_000;
  return {
    weekly: fresh && typeof u.weekly === "number" ? u.weekly : null,
    fiveHour: fresh && typeof u.fiveHour === "number" ? u.fiveHour : null,
    dayCap: u && typeof u.nightBefore === "number" ? u.nightBefore + 14 : 0,
  };
}

function readLines(path) {
  return existsSync(path) ? readFileSync(path, "utf8").split("\n") : [];
}

/** STATUS は 1 行 1 件の追記（PR #88 のレビュー #2）。seq は前の行の続き */
let seq = null;
function setStatus(p, packet, state, reason) {
  if (seq === null) {
    seq = readLines(p.status).reduce((max, line) => {
      try {
        return Math.max(max, Number(JSON.parse(line).seq) || 0);
      } catch {
        return max;
      }
    }, 0);
  }
  seq += 1;
  mkdirSync(dirname(p.status), { recursive: true });
  appendFileSync(p.status, `${statusLine(seq, packet, state, reason)}
`);
}

/** Windows では子を殺しても孫（檻の server・npm run check）が残るので、木ごと止める（PR #88 のレビュー #8） */
function killTree(child) {
  if (process.platform === "win32" && child.pid) {
    try {
      execFileSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
      return;
    } catch {
      // 既に終わっている
    }
  }
  child.kill();
}

/** 1 本を檻で走らせる。手数（CAGE_LOG の行数）と壁時計で殺す */
function runClaude(queue, packet, tree, cageJson, logPath) {
  const prompt = readFileSync(join(REPO, "scripts", "relay", "PACKET.txt"), "utf8").replaceAll("Txx", packet.id);
  const args = [
    "-p",
    prompt,
    "--tools",
    "",
    "--strict-mcp-config",
    "--mcp-config",
    cageJson,
    "--allowedTools",
    "mcp__cage",
    "--permission-mode",
    "dontAsk",
    "--setting-sources",
    "project",
    "--no-session-persistence",
    "--model",
    queue.model,
    "--max-budget-usd",
    String(queue.maxBudgetUsd),
    "--output-format",
    "stream-json",
    "--verbose",
  ];
  return new Promise((resolve) => {
    const child = spawn(CLAUDE, args, { cwd: tree, env: CHILD_ENV, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
    const tail = [];
    let buffer = "";
    let killedFor = null;
    child.stdout.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        tail.push(line);
        if (tail.length > 200) tail.shift();
      }
    });
    child.stderr.on("data", () => {});
    const kill = (reason) => {
      if (killedFor === null) killedFor = reason;
      killTree(child);
    };
    const wall = setTimeout(() => kill("wall"), queue.wallMinutes * 60_000);
    const turns = setInterval(() => {
      if (readLines(logPath).filter((l) => l.trim() !== "").length > queue.maxToolCalls) kill("turns");
    }, 5_000);
    child.on("error", () => {
      clearTimeout(wall);
      clearInterval(turns);
      resolve({ exitCode: null, lines: tail, killedFor });
    });
    child.on("close", (code) => {
      clearTimeout(wall);
      clearInterval(turns);
      if (buffer) tail.push(buffer);
      resolve({ exitCode: code, lines: tail, killedFor });
    });
  });
}

function collect(packet, tree, start, logPath) {
  const subjects = (tryGit(tree, "log", "--reverse", "--format=%s", `${start}..HEAD`) ?? "").split("\n").filter(Boolean);
  const changed = (tryGit(tree, "diff", "--name-only", `${start}..HEAD`) ?? "").split("\n").filter(Boolean);
  const added = (tryGit(tree, "diff", "--numstat", `${start}..HEAD`) ?? "")
    .split("\n")
    .filter(Boolean)
    .reduce((sum, line) => sum + (Number.parseInt(line.split("\t")[0], 10) || 0), 0);
  const toolCalls = readLines(logPath)
    .filter((l) => l.trim() !== "")
    .map((l) => {
      try {
        const v = JSON.parse(l);
        return { name: String(v.name), args: typeof v.args === "object" && v.args !== null ? v.args : {} };
      } catch {
        return { name: "broken", args: {} };
      }
    });
  return {
    questionsExists: existsSync(join(tree, "docs", "run", "QUESTIONS.md")),
    commitSubjects: subjects,
    changedFiles: changed,
    addedLines: added,
    report: tryGit(tree, "show", `HEAD:docs/run/REPORT-${packet.id}.md`),
    statusAfter: tryGit(tree, "status", "--porcelain", "--untracked-files=all") ?? "?",
    toolCalls,
  };
}

async function runTrain(today, queue, skip) {
  const p = paths(today);
  const state = readJson(p.state, { packets: {} });
  let unknownStreak = 0; // 列車ごとに数える（PR #88 のレビュー #7）
  const started = Date.now();
  const trainLines = [];
  const record = (packet, entry) => {
    state.packets[packet.id] = entry;
    write(p.state, `${JSON.stringify(state, null, 2)}\n`);
    trainLines.push(`| ${packet.id} | ${entry.state} | ${entry.reason} | ${entry.costUsd === undefined ? "—" : `$${entry.costUsd.toFixed(2)}`} |`);
    setStatus(p, packet.id, entry.state, entry.reason);
  };
  let trainReason = "done";

  for (const packet of queue.packets) {
    if (state.packets[packet.id]) continue; // 止まった・済んだパケットは同じ日に再開しない
    if (skip.includes(packet.id)) {
      record(packet, { state: "skipped", reason: "skip" });
      continue;
    }
    const usage = readUsage(p);
    const stopReason = preStartGate({
      weeklyPercent: usage.weekly,
      fiveHourPercent: usage.fiveHour,
      dayCapPercent: usage.dayCap,
      ledgerUsd: ledgerTotal(readLines(p.ledger), queue.maxBudgetUsd),
      maxBudgetUsd: queue.maxBudgetUsd,
      capUsd: queue.capUsd,
      stopRequested: existsSync(p.stop),
      elapsedHours: (Date.now() - started) / 3600_000,
      trainHours: queue.trainHours,
      unknownStreak,
    });
    if (stopReason !== null) {
      trainReason = stopReason;
      break;
    }

    // 土台: 前のパケットなら、その GREEN の上に積む
    let base;
    if (/^T\d+$/.test(packet.base)) {
      const dep = state.packets[packet.base];
      if (!dep || dep.state !== "green") {
        record(packet, { state: "skipped", reason: "dep" });
        continue;
      }
      base = dep.head;
    } else {
      base = tryGit(REPO, "rev-parse", "--verify", `${packet.base}^{commit}`)?.trim();
    }
    const tree = join(TREES, packet.id);
    if (!base || !existsSync(tree)) {
      record(packet, { state: "stopped", reason: "base" });
      continue;
    }

    // 始める前に worktree が空か。前の運転の QUESTIONS だけは state に退避する（無人の Claude ではなく進行役が動かす）
    const questions = join(tree, "docs", "run", "QUESTIONS.md");
    mkdirSync(p.stateDir, { recursive: true }); // 初めての列車でも退避できるように（レビュー #9）
    if (existsSync(questions)) renameSync(questions, join(p.stateDir, `${today}-${packet.id}-old-QUESTIONS.md`));
    if ((tryGit(tree, "status", "--porcelain", "--untracked-files=all") ?? "?").trim() !== "") {
      record(packet, { state: "stopped", reason: "dirty" });
      continue;
    }
    git(tree, "checkout", "-q", "-B", `run/${today}-${packet.id}`, base);
    const start = git(tree, "rev-parse", "HEAD").trim();

    const logPath = join(p.logs, `${today}-${packet.id}.jsonl`);
    write(logPath, "");
    const cageJson = join(p.stateDir, `${today}-${packet.id}-cage.json`);
    write(
      cageJson,
      JSON.stringify({ mcpServers: { cage: { command: process.execPath, args: [CAGE_SERVER], env: cageEnv(packet, tree, logPath, start, NPM_CLI) } } }),
    );

    const run = await runClaude(queue, packet, tree, cageJson, logPath);
    const cost = costFromStream(run.lines, queue.maxBudgetUsd);
    appendFileSync(p.ledger, `${JSON.stringify({ id: packet.id, costUsd: cost.costUsd, turns: cost.turns, isError: cost.isError, killedFor: run.killedFor })}\n`);

    const outcome = { id: packet.id, exitCode: run.exitCode, isError: cost.isError, killedFor: run.killedFor, ...collect(packet, tree, start, logPath) };
    const limits = { allow: packet.allow, maxAddedLines: queue.maxAddedLines, maxCheckOutputKb: queue.maxCheckOutputKb, maxToolCalls: queue.maxToolCalls };
    const decision = postGates(outcome, limits, findSecretLikeLines);
    unknownStreak = decision.state !== "ask" && isUnknownFailure(outcome) ? unknownStreak + 1 : 0;
    record(packet, {
      ...decision,
      branch: `run/${today}-${packet.id}`,
      start,
      head: git(tree, "rev-parse", "HEAD").trim(),
      costUsd: cost.costUsd,
      turns: cost.turns,
    });
  }

  write(
    p.train,
    mask(
      `# ${today} の列車\n\n| パケット | 状態 | 理由 | $ |\n|---|---|---|---|\n${trainLines.join("\n")}\n\n列車: ${trainReason}\n`,
      where(TREES),
    ),
  );
  setStatus(p, null, "train", trainReason);
  console.log(`列車: ${trainReason}`);
}

const { today, skip, prepare: wantPrepare } = parseRunDayArgs(process.argv.slice(2));
const p = paths(today);
const queue = loadQueue(p);
if (wantPrepare) prepare(queue);
else {
  // 二重起動を断る（PR #88 のレビュー #1）。同じパケットが同じ worktree で 2 本走ると、費用と state が壊れる
  if (isRunning(readJson(p.running, null), alive)) {
    console.error("進行役はもう走っている（二重起動しない）");
    process.exit(2);
  }
  write(p.running, JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
  try {
    await runTrain(today, queue, skip);
  } finally {
    rmSync(p.running, { force: true });
  }
}
