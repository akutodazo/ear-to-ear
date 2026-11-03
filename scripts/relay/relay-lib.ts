// 檻リレー（ハーネス v0.6、docs/dev/harness-v0.6-relay.md）の判定。純粋関数だけ。
// run-day.mjs・watch.mjs が Node から直接読むので、import を書かない（AGENTS.md §4。秘密の検査は引数で受け取る）。
// LLM を呼ばない。進行・合否・停止はここで決める。

/** パケット 1 本（待ち行列の 1 行） */
export interface Packet {
  id: string;
  /** "main"・ブランチ名、または前のパケットの id（その GREEN の上に積む） */
  base: string;
  /** 無人の Claude が書いてよいファイル（CAGE_ALLOW） */
  allow: string[];
  /** C3 と run_tests で回すテスト */
  tests: string[];
}

/** 1 日の待ち行列（%LOCALAPPDATA%\ear-train\trains\<MMDD>.json） */
export interface Queue {
  date: string;
  model: string;
  capUsd: number;
  maxBudgetUsd: number;
  maxToolCalls: number;
  wallMinutes: number;
  trainHours: number;
  maxAddedLines: number;
  maxCheckOutputKb: number;
  packets: Packet[];
}

/** STATUS.json・state に書く理由は、この列挙だけ（自由文を入れない。手元のパスや中身が通知に載らないように） */
export const REASONS = [
  "usage",
  "budget",
  "stop",
  "time",
  "unknown",
  "claude",
  "ask",
  "commits",
  "scope",
  "size",
  "check",
  "leak",
  "output",
  "dirty",
  "log",
  "turns",
  "wall",
  "dep",
  "base",
  "skip",
  "done",
] as const;
export type Reason = (typeof REASONS)[number];

export type PacketState = "green" | "ask" | "stopped" | "skipped";

/** 無人で変えない・共有のファイル（AGENTS.md §2・§5）と、秘密の置き場。allow にあれば列車を起動しない */
const FROZEN: readonly RegExp[] = [
  /\.test\.tsx?$/,
  /^tests\//,
  /^src\/types\//,
  /^src\/config\.ts$/,
  /^vitest\.config\./,
  /^package(-lock)?\.json$/,
  /^tsconfig[^/]*\.json$/,
  /^eslint\.config\./,
  /^\.gitignore$/,
  /^\.claude\//,
  /^AGENTS\.md$/,
  /^CLAUDE\.md$/,
  /^scripts\//,
  /^docs\/run\/TASKS\.md$/,
  /^migrations\//,
  /(^|\/)\.dev\.vars/,
  /(^|\/)\.env/,
  /^private\//,
];

/** 凍結・共有・秘密のファイルか */
export function isFrozenPath(path: string): boolean {
  return FROZEN.some((re) => re.test(path));
}

/** リポジトリの中の相対パスとして素直か（\・..・先頭の /・ドライブ名・空を認めない） */
export function isPlainRelativePath(path: string): boolean {
  if (path.length === 0 || path.length > 200) return false;
  if (path.includes("\\") || path.startsWith("/") || /^[A-Za-z]:/.test(path)) return false;
  return path.split("/").every((part) => part !== "" && part !== "." && part !== "..");
}

const ID = /^T\d{1,3}$/;
const DATE = /^\d{4}$/;
const BRANCH = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,99}$/;

function positive(value: unknown, max: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 && value <= max;
}

function stringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export type QueueResult = { ok: true; queue: Queue } | { ok: false; errors: string[] };

/** 待ち行列を検査する。誤りは全部集めて返す（列車を起動するかどうかは呼ぶ側が決める） */
export function validateQueue(raw: unknown): QueueResult {
  const errors: string[] = [];
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return { ok: false, errors: ["待ち行列がオブジェクトではない"] };
  const q = raw as Record<string, unknown>;
  if (typeof q.date !== "string" || !DATE.test(q.date)) errors.push("date は MMDD の 4 桁");
  if (q.model !== "opus" && q.model !== "sonnet" && q.model !== "haiku") errors.push("model は opus・sonnet・haiku");
  const limits: [string, number][] = [
    ["capUsd", 20],
    ["maxBudgetUsd", 5],
    ["maxToolCalls", 200],
    ["wallMinutes", 120],
    ["trainHours", 10],
    ["maxAddedLines", 3000],
    ["maxCheckOutputKb", 500],
  ];
  for (const [key, max] of limits) if (!positive(q[key], max)) errors.push(`${key} は 0 より大きく ${max} 以下の数`);
  if (positive(q.capUsd, 20) && positive(q.maxBudgetUsd, 5) && q.maxBudgetUsd > q.capUsd) errors.push("maxBudgetUsd が capUsd を超える");
  if (!Array.isArray(q.packets) || q.packets.length === 0) {
    errors.push("packets が空");
    return { ok: false, errors };
  }
  const seen = new Set<string>();
  q.packets.forEach((value: unknown, index: number) => {
    const where = `packets[${index}]`;
    if (typeof value !== "object" || value === null) {
      errors.push(`${where} がオブジェクトではない`);
      return;
    }
    const p = value as Record<string, unknown>;
    const id = typeof p.id === "string" && ID.test(p.id) ? p.id : null;
    if (id === null) errors.push(`${where}.id は Txx の形`);
    else if (seen.has(id)) errors.push(`${where}.id ${id} が重なる`);
    if (typeof p.base !== "string" || !(seen.has(p.base) || (!ID.test(p.base) && BRANCH.test(p.base) && !p.base.includes("..")))) {
      errors.push(`${where}.base は main・ブランチ名・前のパケットの id`);
    }
    if (!stringArray(p.allow) || p.allow.length === 0) errors.push(`${where}.allow が空`);
    else {
      for (const path of p.allow) {
        if (!isPlainRelativePath(path)) errors.push(`${where}.allow に素直でないパス`);
        else if (isFrozenPath(path)) errors.push(`${where}.allow に凍結・共有・秘密のファイル ${path}`);
      }
    }
    if (!stringArray(p.tests) || p.tests.length === 0) errors.push(`${where}.tests が空`);
    else if (!p.tests.every((t) => isPlainRelativePath(t) && /\.test\.tsx?$/.test(t))) errors.push(`${where}.tests は *.test.ts の相対パスだけ`);
    if (id !== null) seen.add(id);
  });
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, queue: raw as Queue };
}

/** 檻の検査 C1〜C5（AGENTS.md §5）。argv はシェルを通らないので、全部 git か node で書く */
export function checksFor(packet: Packet, start: string, npmCli: string): { name: string; argv: string[] }[] {
  const status = ["git", "status", "--porcelain", "--untracked-files=all"];
  return [
    { name: "C1 git status --porcelain --untracked-files=all", argv: status },
    { name: `C2 git diff --name-only ${start}..HEAD`, argv: ["git", "diff", "--name-only", `${start}..HEAD`] },
    { name: `C3 vitest run（${packet.id} のテスト）`, argv: ["node", "node_modules/vitest/vitest.mjs", "run", ...packet.tests] },
    { name: "C4 npm run check", argv: ["node", npmCli, "run", "check"] },
    { name: "C5 git status --porcelain --untracked-files=all", argv: status },
  ];
}

/** 檻（scripts/cage/server.mjs）に渡す環境変数。秘密は入れない */
export function cageEnv(packet: Packet, root: string, logPath: string, start: string, npmCli: string): Record<string, string> {
  return {
    CAGE_ROOT: root,
    CAGE_ALLOW: packet.allow.join(","),
    CAGE_LOG: logPath,
    CAGE_TEST: JSON.stringify(["node_modules/vitest/vitest.mjs", "run", "--reporter=dot", ...packet.tests]),
    CAGE_CHECKS: JSON.stringify(checksFor(packet, start, npmCli)),
    CAGE_TIMEOUT_MS: "600000",
  };
}

/** 起動前に見るもの */
export interface PreStart {
  /** 週次の使用率（%）。読めなければ null */
  weeklyPercent: number | null;
  /** 5 時間の使用率（%）。読めなければ null */
  fiveHourPercent: number | null;
  /** その日の週次の上限（前夜の % + 14） */
  dayCapPercent: number;
  /** その日の ledger の合計（$） */
  ledgerUsd: number;
  maxBudgetUsd: number;
  capUsd: number;
  stopRequested: boolean;
  elapsedHours: number;
  trainHours: number;
  /** 「GREEN もQUESTIONS も無く終わった」が続いた本数 */
  unknownStreak: number;
}

/** 起動前ゲート（G-1・G8 ほか）。止めるなら理由、進めるなら null。読めない使用量は止める側に倒す */
export function preStartGate(s: PreStart): Reason | null {
  if (s.stopRequested) return "stop";
  if (s.unknownStreak >= 2) return "unknown";
  if (s.elapsedHours >= s.trainHours) return "time";
  if (s.weeklyPercent === null || s.fiveHourPercent === null) return "usage";
  if (s.weeklyPercent >= s.dayCapPercent - 2 || s.fiveHourPercent >= 80) return "usage";
  if (s.ledgerUsd + s.maxBudgetUsd > s.capUsd) return "budget";
  return null;
}

/** 1 本が終わった後に集めたもの */
export interface Outcome {
  id: string;
  exitCode: number | null;
  isError: boolean;
  /** 進行役が手数・壁時計で止めたとき */
  killedFor: "turns" | "wall" | null;
  questionsExists: boolean;
  /** START..HEAD のコミットの件名（古い順） */
  commitSubjects: string[];
  changedFiles: string[];
  addedLines: number;
  /** HEAD の docs/run/REPORT-Txx.md。無ければ null */
  report: string | null;
  /** 終わった後の git status --porcelain --untracked-files=all */
  statusAfter: string;
  /** CAGE_LOG の行 */
  toolCalls: { name: string; args: Record<string, unknown> }[];
}

export interface GateLimits {
  allow: readonly string[];
  maxAddedLines: number;
  maxCheckOutputKb: number;
  maxToolCalls: number;
}

/** REPORT を「## Cn …」ごとの中身に分ける */
export function reportBlocks(report: string): Map<string, string> {
  const blocks = new Map<string, string>();
  const parts = report.split(/^## (C\d)\b[^\n]*\n/m);
  for (let i = 1; i + 1 < parts.length; i += 2) {
    const body = parts[i + 1].replace(/^```\n?/, "").replace(/\n?```\s*$/, "");
    blocks.set(parts[i], body);
  }
  return blocks;
}

const QUESTIONS = "docs/run/QUESTIONS.md";

/**
 * 終わった後のゲート G0〜G7。順に見て、最初に当たった理由で止める。偽陽性は止まる側。
 * findSecrets は scripts/safety-rules.ts の findSecretLikeLines（引数で受け取る）
 */
export function postGates(o: Outcome, limits: GateLimits, findSecrets: (text: string) => unknown[]): { state: PacketState; reason: Reason } {
  const stopped = (reason: Reason) => ({ state: "stopped" as const, reason });
  // G7 の手数は、殺した理由として先に返す
  if (o.killedFor !== null) return stopped(o.killedFor);
  // G1: 止まって聞いている（中身は読まない）。終了コードより先に見る
  if (o.questionsExists) return { state: "ask", reason: "ask" };
  // G0
  if (o.exitCode !== 0 || o.isError) return stopped("claude");
  // G2: 「Txx GREEN: 」が 1 つ以上、最後に「Txx REPORT」が 1 つだけ
  const green = new RegExp(`^${o.id} GREEN: \\S`);
  const subjects = o.commitSubjects;
  if (
    subjects.length < 2 ||
    subjects[subjects.length - 1] !== `${o.id} REPORT` ||
    !subjects.slice(0, -1).every((s) => green.test(s))
  ) {
    return stopped(o.commitSubjects.length === 0 ? "claude" : "commits");
  }
  // G3: 変えたのは allow と自分の REPORT だけ。凍結・共有・秘密は allow に書いてあっても落とす
  const allowed = new Set([...limits.allow, `docs/run/REPORT-${o.id}.md`]);
  if (o.changedFiles.some((f) => !allowed.has(f) || (isFrozenPath(f) && f !== `docs/run/REPORT-${o.id}.md`))) return stopped("scope");
  // G4
  if (o.addedLines > limits.maxAddedLines) return stopped("size");
  // G5: REPORT の形・不合格・秘密らしい行・出力の大きさ
  if (o.report === null || !o.report.startsWith(`# ${o.id} REPORT（検査済み・人の確認待ち）\n`)) return stopped("check");
  const blocks = reportBlocks(o.report);
  if (!["C1", "C2", "C3", "C4", "C5"].every((c) => blocks.has(c))) return stopped("check");
  if ((blocks.get("C1") ?? "x").trim() !== "" || (blocks.get("C5") ?? "x").trim() !== "") return stopped("check");
  if ([...blocks.values()].some((b) => b.startsWith("FAILED"))) return stopped("check");
  if (findSecrets(o.report).length > 0) return stopped("leak");
  if ([...blocks.values()].some((b) => b.length > limits.maxCheckOutputKb * 1024)) return stopped("output");
  // G6
  if (o.statusAfter.trim() !== "") return stopped("dirty");
  // G7: 書こうとしたファイルは allow と QUESTIONS だけ、手数は上限まで
  const writable = new Set([...limits.allow, QUESTIONS]);
  const strayWrites = o.toolCalls.filter((c) => c.name === "write_file" && !writable.has(String(c.args.path ?? "").replace(/\\/g, "/")));
  if (strayWrites.length >= 1) return stopped("log");
  if (o.toolCalls.length > limits.maxToolCalls) return stopped("turns");
  return { state: "green", reason: "done" };
}

/** 「GREEN もQUESTIONS も無く終わった」（原因不明）か。2 本続いたら列車を止める（G0 のフェイルクローズ） */
export function isUnknownFailure(o: Outcome): boolean {
  return !o.questionsExists && !o.commitSubjects.some((s) => s.startsWith(`${o.id} GREEN: `));
}

/** stream-json の行から、最後の result の費用・手数・誤りを取る。取れなければ費用は上限いっぱい（安全側） */
export function costFromStream(lines: readonly string[], maxBudgetUsd: number): { costUsd: number; turns: number | null; isError: boolean; found: boolean } {
  for (let i = lines.length - 1; i >= 0; i--) {
    let value: unknown;
    try {
      value = JSON.parse(lines[i]);
    } catch {
      continue;
    }
    if (typeof value !== "object" || value === null) continue;
    const v = value as Record<string, unknown>;
    if (v.type !== "result") continue;
    const cost = typeof v.total_cost_usd === "number" && Number.isFinite(v.total_cost_usd) ? v.total_cost_usd : maxBudgetUsd;
    const turns = typeof v.num_turns === "number" ? v.num_turns : null;
    return { costUsd: cost, turns, isError: v.is_error === true, found: true };
  }
  return { costUsd: maxBudgetUsd, turns: null, isError: true, found: false };
}

/** ledger（1 行 1 本の JSON）の合計。壊れた行は上限いっぱいとして数える */
export function ledgerTotal(lines: readonly string[], maxBudgetUsd: number): number {
  let total = 0;
  for (const line of lines) {
    if (line.trim() === "") continue;
    try {
      const v = JSON.parse(line) as { costUsd?: unknown };
      total += typeof v.costUsd === "number" && Number.isFinite(v.costUsd) && v.costUsd >= 0 ? v.costUsd : maxBudgetUsd;
    } catch {
      total += maxBudgetUsd;
    }
  }
  return total;
}

/** 手元のパス・ユーザー名・色の制御文字を伏せる（scripts/cage/server.mjs の mask と同じ順） */
export function mask(text: string, where: { root: string; home: string; user: string }): string {
  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pathPattern = (path: string) => new RegExp(path.split(/[\\/]/).map(escape).join("[\\\\/]"), "gi");
  let out = text.replace(/\x1b\[[0-9;]*[A-Za-z]/g, "");
  if (where.root.length > 0) out = out.replace(pathPattern(where.root), "<作業フォルダ>");
  if (where.home.length > 0) out = out.replace(pathPattern(where.home), "<ホーム>");
  if (where.user.length >= 3) out = out.replace(new RegExp(escape(where.user), "gi"), "<ユーザー>");
  return out;
}

/** STATUS.json の 1 行。理由は列挙だけ */
export function statusLine(seq: number, packet: string | null, state: PacketState | "train", reason: Reason): string {
  if (!REASONS.includes(reason)) throw new Error("知らない理由");
  if (packet !== null && !ID.test(packet)) throw new Error("パケットの id の形が違う");
  return JSON.stringify({ seq, packet, state, reason });
}

/** 通知の本文（200 字以内、1 行）。差分・パス・中身を入れない */
export function notifyText(line: { packet: string | null; state: string; reason: Reason }, summary?: { green: number; ask: number; stopped: number; usd: number }): string | null {
  if (line.state === "ask") return `${line.packet} 停止: 質問あり（他は続行）。返事は「${line.packet} を飛ばして続けて」か「止めて」`;
  if (line.state === "stopped") return `${line.packet} 停止: ${line.reason}。他は続行`;
  if (line.state === "train" && line.reason !== "done") return `列車停止: ${line.reason}`;
  if (line.state === "train" && summary) {
    return `列車終了: GREEN ${summary.green}／ask ${summary.ask}／stopped ${summary.stopped}、$${summary.usd.toFixed(2)}`;
  }
  return null;
}

/** run-day の引数。--today MMDD・--skip Txx（何回でも）・--prepare だけ。ほかはエラー */
export function parseRunDayArgs(argv: readonly string[]): { today: string; skip: string[]; prepare: boolean } {
  let today: string | null = null;
  const skip: string[] = [];
  let prepare = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--prepare") prepare = true;
    else if (a === "--today" && i + 1 < argv.length && DATE.test(argv[i + 1]) && today === null) today = argv[++i];
    else if (a === "--skip" && i + 1 < argv.length && ID.test(argv[i + 1])) skip.push(argv[++i]);
    else throw new Error("引数は --today MMDD・--skip Txx・--prepare だけ");
  }
  if (today === null) throw new Error("--today MMDD が要る");
  return { today, skip, prepare };
}

/** 通知係を起こした回数の上限（パケット数 + 3）を超えたか */
export function tooManyWakes(wakes: number, packets: number): boolean {
  return wakes > packets + 3;
}
