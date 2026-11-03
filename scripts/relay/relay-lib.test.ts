import { describe, expect, it } from "vitest";
import { findSecretLikeLines } from "../safety-rules";
import {
  cageEnv,
  checksFor,
  costFromStream,
  isFrozenPath,
  isPlainRelativePath,
  isUnknownFailure,
  ledgerTotal,
  mask,
  notifyText,
  type Outcome,
  parseRunDayArgs,
  postGates,
  preStartGate,
  type PreStart,
  reportBlocks,
  statusLine,
  tooManyWakes,
  validateQueue,
} from "./relay-lib";

const PACKET = { id: "T22", base: "main", allow: ["src/services/photo-query.ts", "worker/photos.ts"], tests: ["worker/photos-field.test.ts"] };

function queue(overrides: Record<string, unknown> = {}) {
  return {
    date: "1104",
    model: "opus",
    capUsd: 3,
    maxBudgetUsd: 1.5,
    maxToolCalls: 40,
    wallMinutes: 45,
    trainHours: 4,
    maxAddedLines: 400,
    maxCheckOutputKb: 20,
    packets: [PACKET],
    ...overrides,
  };
}

describe("isFrozenPath", () => {
  it.each([
    "worker/photos.test.ts",
    "src/types/index.ts",
    "src/config.ts",
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "eslint.config.mjs",
    "vitest.config.ts",
    ".gitignore",
    ".claude/settings.json",
    "AGENTS.md",
    "CLAUDE.md",
    "scripts/cage/server.mjs",
    "docs/run/TASKS.md",
    "migrations/0002_handover.sql",
    ".dev.vars",
    "worker/.env.local",
    "private/fixtures/a.jpg",
  ])("%s は凍結・共有・秘密", (path) => {
    expect(isFrozenPath(path)).toBe(true);
  });

  it.each(["worker/photos.ts", "src/services/photo-query.ts", "src/components/map.tsx", "docs/run/REPORT-T22.md"])("%s は書いてよい側", (path) => {
    expect(isFrozenPath(path)).toBe(false);
  });
});

describe("isPlainRelativePath", () => {
  it.each(["", "/etc/x", "C:/x", "a\\b", "../a", "a/../b", "a//b", "./a", "a/"])("%j は素直でない", (path) => {
    expect(isPlainRelativePath(path)).toBe(false);
  });
  it("ふつうの相対パスは素直", () => {
    expect(isPlainRelativePath("worker/photos.ts")).toBe(true);
  });
});

describe("validateQueue", () => {
  it("正しい待ち行列は通る", () => {
    expect(validateQueue(queue())).toEqual({ ok: true, queue: queue() });
  });

  it("allow に凍結・共有のファイルがあれば、名前を挙げて拒否する", () => {
    const result = validateQueue(queue({ packets: [{ ...PACKET, allow: ["worker/photos.ts", "src/config.ts"] }] }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join("\n")).toContain("src/config.ts");
  });

  it("allow のテストファイル・秘密も拒否する", () => {
    for (const bad of ["worker/photos.test.ts", ".dev.vars", "private/a.txt", "scripts/relay/run-day.mjs"]) {
      expect(validateQueue(queue({ packets: [{ ...PACKET, allow: [bad] }] })).ok).toBe(false);
    }
  });

  it("base は main・ブランチ名・前のパケットの id。後ろのパケットや自分は指せない", () => {
    const second = { ...PACKET, id: "T23", base: "T22", allow: ["worker/fields.ts"] };
    expect(validateQueue(queue({ packets: [PACKET, second] })).ok).toBe(true);
    expect(validateQueue(queue({ packets: [{ ...PACKET, base: "T23" }, { ...second, base: "main" }] })).ok).toBe(false);
    expect(validateQueue(queue({ packets: [{ ...PACKET, base: "T22" }] })).ok).toBe(false);
    expect(validateQueue(queue({ packets: [{ ...PACKET, base: "t22-photos-by-field" }] })).ok).toBe(true);
    expect(validateQueue(queue({ packets: [{ ...PACKET, base: "a..b" }] })).ok).toBe(false);
    expect(validateQueue(queue({ packets: [{ ...PACKET, base: "-x" }] })).ok).toBe(false);
  });

  it("id の重なり・形の違いを拒否する", () => {
    expect(validateQueue(queue({ packets: [PACKET, PACKET] })).ok).toBe(false);
    expect(validateQueue(queue({ packets: [{ ...PACKET, id: "22" }] })).ok).toBe(false);
  });

  it("tests は *.test.ts だけ", () => {
    expect(validateQueue(queue({ packets: [{ ...PACKET, tests: ["worker/photos.ts"] }] })).ok).toBe(false);
    expect(validateQueue(queue({ packets: [{ ...PACKET, tests: [] }] })).ok).toBe(false);
  });

  it("数の上限・型・model・date を見る。maxBudgetUsd は capUsd 以下", () => {
    expect(validateQueue(queue({ capUsd: 0 })).ok).toBe(false);
    expect(validateQueue(queue({ capUsd: 1, maxBudgetUsd: 1.5 })).ok).toBe(false);
    expect(validateQueue(queue({ maxToolCalls: "40" })).ok).toBe(false);
    expect(validateQueue(queue({ model: "fable" })).ok).toBe(false);
    expect(validateQueue(queue({ date: "11-04" })).ok).toBe(false);
    expect(validateQueue(queue({ packets: [] })).ok).toBe(false);
    expect(validateQueue(null).ok).toBe(false);
    expect(validateQueue([]).ok).toBe(false);
  });
});

describe("checksFor・cageEnv", () => {
  it("C1〜C5 は git と node だけで、C2 は START から、C3 はパケットのテスト", () => {
    const checks = checksFor(PACKET, "abc1234", "C:/npm/npm-cli.js");
    expect(checks.map((c) => c.name.slice(0, 2))).toEqual(["C1", "C2", "C3", "C4", "C5"]);
    expect(checks.every((c) => c.argv[0] === "git" || c.argv[0] === "node")).toBe(true);
    expect(checks[1].argv).toEqual(["git", "diff", "--name-only", "abc1234..HEAD"]);
    expect(checks[2].argv.slice(-1)).toEqual(["worker/photos-field.test.ts"]);
    expect(checks[3].argv).toEqual(["node", "C:/npm/npm-cli.js", "run", "check"]);
    expect(checks[4].argv).toEqual(checks[0].argv);
  });

  it("檻の環境変数は 6 つだけで、allow とテストを渡す", () => {
    const env = cageEnv(PACKET, "W:/wt/T22", "L:/logs/T22.jsonl", "abc1234", "C:/npm/npm-cli.js");
    expect(Object.keys(env).sort()).toEqual(["CAGE_ALLOW", "CAGE_CHECKS", "CAGE_LOG", "CAGE_ROOT", "CAGE_TEST", "CAGE_TIMEOUT_MS"]);
    expect(env.CAGE_ALLOW).toBe("src/services/photo-query.ts,worker/photos.ts");
    expect(JSON.parse(env.CAGE_TEST)).toEqual(["node_modules/vitest/vitest.mjs", "run", "--reporter=dot", "worker/photos-field.test.ts"]);
    expect(JSON.parse(env.CAGE_CHECKS)).toHaveLength(5);
  });
});

const OK_START: PreStart = {
  weeklyPercent: 20,
  fiveHourPercent: 10,
  dayCapPercent: 34,
  ledgerUsd: 0,
  maxBudgetUsd: 1.5,
  capUsd: 3,
  stopRequested: false,
  elapsedHours: 0,
  trainHours: 4,
  unknownStreak: 0,
};

describe("preStartGate", () => {
  it("余裕があれば進める", () => {
    expect(preStartGate(OK_START)).toBeNull();
  });

  it("STOP があれば何より先に止める", () => {
    expect(preStartGate({ ...OK_START, stopRequested: true, weeklyPercent: 99 })).toBe("stop");
  });

  it("使用量が読めなければ止める（安全側）", () => {
    expect(preStartGate({ ...OK_START, weeklyPercent: null })).toBe("usage");
    expect(preStartGate({ ...OK_START, fiveHourPercent: null })).toBe("usage");
  });

  it("週次が当日の上限 − 2 以上、5 時間が 80 以上なら止める", () => {
    expect(preStartGate({ ...OK_START, weeklyPercent: 31 })).toBeNull();
    expect(preStartGate({ ...OK_START, weeklyPercent: 32 })).toBe("usage");
    expect(preStartGate({ ...OK_START, fiveHourPercent: 79 })).toBeNull();
    expect(preStartGate({ ...OK_START, fiveHourPercent: 80 })).toBe("usage");
  });

  it("予算は開始前に見る: 累計 + 1 本の上限が capUsd を超えるなら起動しない", () => {
    expect(preStartGate({ ...OK_START, ledgerUsd: 1.5 })).toBeNull();
    expect(preStartGate({ ...OK_START, ledgerUsd: 1.51 })).toBe("budget");
  });

  it("原因不明が 2 本続いたら止める。時間切れも止める", () => {
    expect(preStartGate({ ...OK_START, unknownStreak: 1 })).toBeNull();
    expect(preStartGate({ ...OK_START, unknownStreak: 2 })).toBe("unknown");
    expect(preStartGate({ ...OK_START, elapsedHours: 4 })).toBe("time");
  });
});

const GOOD_REPORT = [
  "# T22 REPORT（検査済み・人の確認待ち）",
  "",
  "## C1 git status --porcelain --untracked-files=all",
  "```",
  "",
  "```",
  "",
  "## C2 git diff --name-only abc..HEAD",
  "```",
  "src/services/photo-query.ts",
  "worker/photos.ts",
  "```",
  "",
  "## C3 vitest run（T22 のテスト）",
  "```",
  " Test Files  1 passed (1)",
  "```",
  "",
  "## C4 npm run check",
  "```",
  "check:safety: OK",
  "```",
  "",
  "## C5 git status --porcelain --untracked-files=all",
  "```",
  "",
  "```",
  "",
].join("\n");

const GOOD: Outcome = {
  id: "T22",
  exitCode: 0,
  isError: false,
  killedFor: null,
  questionsExists: false,
  commitSubjects: ["T22 GREEN: 圃場ごとの一覧", "T22 REPORT"],
  changedFiles: ["src/services/photo-query.ts", "worker/photos.ts", "docs/run/REPORT-T22.md"],
  addedLines: 40,
  report: GOOD_REPORT,
  statusAfter: "",
  toolCalls: [{ name: "write_file", args: { path: "worker/photos.ts" } }],
};
const LIMITS = { allow: PACKET.allow, maxAddedLines: 400, maxCheckOutputKb: 20, maxToolCalls: 40 };
const gate = (o: Partial<Outcome>) => postGates({ ...GOOD, ...o }, LIMITS, findSecretLikeLines);

describe("reportBlocks", () => {
  it("C1〜C5 の中身を取り出す", () => {
    const blocks = reportBlocks(GOOD_REPORT);
    expect([...blocks.keys()]).toEqual(["C1", "C2", "C3", "C4", "C5"]);
    expect(blocks.get("C1")?.trim()).toBe("");
    expect(blocks.get("C2")).toContain("worker/photos.ts");
  });
});

describe("postGates", () => {
  it("全部そろえば green", () => {
    expect(gate({})).toEqual({ state: "green", reason: "done" });
  });

  it("手数・壁時計で殺したら、その理由で stopped", () => {
    expect(gate({ killedFor: "turns" })).toEqual({ state: "stopped", reason: "turns" });
    expect(gate({ killedFor: "wall", questionsExists: true })).toEqual({ state: "stopped", reason: "wall" });
  });

  it("QUESTIONS があれば ask（終了コードより先）", () => {
    expect(gate({ questionsExists: true, exitCode: 1, commitSubjects: [] })).toEqual({ state: "ask", reason: "ask" });
  });

  it("G0: 終了コード・is_error", () => {
    expect(gate({ exitCode: 1 })).toEqual({ state: "stopped", reason: "claude" });
    expect(gate({ exitCode: null })).toEqual({ state: "stopped", reason: "claude" });
    expect(gate({ isError: true })).toEqual({ state: "stopped", reason: "claude" });
  });

  it("G2: GREEN が無い・REPORT が最後でない・ほかの件名・REPORT が 2 つ", () => {
    expect(gate({ commitSubjects: [] }).reason).toBe("claude");
    expect(gate({ commitSubjects: ["T22 REPORT"] }).reason).toBe("commits");
    expect(gate({ commitSubjects: ["T22 REPORT", "T22 GREEN: x"] }).reason).toBe("commits");
    expect(gate({ commitSubjects: ["T22 GREEN: x", "fix", "T22 REPORT"] }).reason).toBe("commits");
    expect(gate({ commitSubjects: ["T21 GREEN: x", "T22 REPORT"] }).reason).toBe("commits");
    expect(gate({ commitSubjects: ["T22 GREEN: x", "T22 REPORT", "T22 REPORT"] }).reason).toBe("commits");
    expect(gate({ commitSubjects: ["T22 GREEN: a", "T22 GREEN: b", "T22 REPORT"] }).state).toBe("green");
  });

  it("G3: allow と自分の REPORT の外を変えたら scope", () => {
    expect(gate({ changedFiles: [...GOOD.changedFiles, "worker/routes.ts"] }).reason).toBe("scope");
    expect(gate({ changedFiles: [...GOOD.changedFiles, "docs/run/REPORT-T21.md"] }).reason).toBe("scope");
  });

  it("G3: allow に書いてあっても凍結ファイルは scope（validateQueue をすり抜けた場合の二重の守り）", () => {
    const limits = { ...LIMITS, allow: [...LIMITS.allow, "src/config.ts"] };
    expect(postGates({ ...GOOD, changedFiles: ["src/config.ts", "docs/run/REPORT-T22.md"] }, limits, findSecretLikeLines).reason).toBe("scope");
  });

  it("G4: 追加行が上限を超えたら size", () => {
    expect(gate({ addedLines: 400 }).state).toBe("green");
    expect(gate({ addedLines: 401 }).reason).toBe("size");
  });

  it("G5: REPORT が無い・見出しが違う・Cn が欠ける・C1 か C5 が空でない・FAILED", () => {
    expect(gate({ report: null }).reason).toBe("check");
    expect(gate({ report: GOOD_REPORT.replace("# T22 REPORT", "# T21 REPORT") }).reason).toBe("check");
    expect(gate({ report: GOOD_REPORT.replace("## C4 npm run check", "## X4") }).reason).toBe("check");
    expect(gate({ report: GOOD_REPORT.replace("## C1 git status --porcelain --untracked-files=all\n```\n", "## C1 git status\n```\n?? junk.txt") }).reason).toBe("check");
    // 途中に FAILED という語があるだけ（テストの名前など）は合格。report は失敗を「FAILED\n…」でブロックの先頭に書く
    expect(gate({ report: GOOD_REPORT.replace("check:safety: OK", "check:safety: OK\nit FAILED のときの表示") }).state).toBe("green");
    expect(gate({ report: GOOD_REPORT.replace("```\ncheck:safety: OK", "```\nFAILED\nCommand failed") }).reason).toBe("check");
  });

  it("G5: REPORT に秘密らしい行があれば leak、出力が大きすぎれば output", () => {
    const key = ["sk", "ant", "api03", "A".repeat(40)].join("-");
    expect(gate({ report: GOOD_REPORT.replace("check:safety: OK", `token ${key}`) }).reason).toBe("leak");
    expect(gate({ report: GOOD_REPORT.replace("check:safety: OK", "x".repeat(21 * 1024)) }).reason).toBe("output");
  });

  it("G6: 終わった後に未コミットのものが残れば dirty", () => {
    expect(gate({ statusAfter: "?? docs/run/notes.md\n" }).reason).toBe("dirty");
  });

  it("G7: allow の外に書こうとした、手数が上限を超えた", () => {
    expect(gate({ toolCalls: [{ name: "write_file", args: { path: "worker/routes.ts" } }] }).reason).toBe("log");
    expect(gate({ toolCalls: [{ name: "write_file", args: { path: "docs/run/QUESTIONS.md" } }] }).state).toBe("green");
    expect(gate({ toolCalls: [{ name: "write_file", args: { path: "worker\\photos.ts" } }] }).state).toBe("green");
    const many = Array.from({ length: 41 }, () => ({ name: "read_file", args: { path: "a" } }));
    expect(gate({ toolCalls: many }).reason).toBe("turns");
  });
});

describe("isUnknownFailure", () => {
  it("GREEN も QUESTIONS も無いなら原因不明", () => {
    expect(isUnknownFailure({ ...GOOD, commitSubjects: [] })).toBe(true);
    expect(isUnknownFailure({ ...GOOD, commitSubjects: [], questionsExists: true })).toBe(false);
    expect(isUnknownFailure(GOOD)).toBe(false);
  });
});

describe("costFromStream・ledgerTotal", () => {
  it("最後の result の費用・手数・誤りを取る", () => {
    const lines = [
      '{"type":"system"}',
      "not json",
      '{"type":"result","total_cost_usd":0.1,"num_turns":3,"is_error":false}',
      '{"type":"result","total_cost_usd":0.66,"num_turns":27,"is_error":false}',
      "",
    ];
    expect(costFromStream(lines, 1.5)).toEqual({ costUsd: 0.66, turns: 27, isError: false, found: true });
  });

  it("result が無ければ（殺した・壊れた）費用は上限いっぱいで、誤りとする", () => {
    expect(costFromStream(['{"type":"assistant"}'], 1.5)).toEqual({ costUsd: 1.5, turns: null, isError: true, found: false });
  });

  it("ledger の合計。壊れた行・負の値は上限いっぱいとして数える", () => {
    expect(ledgerTotal(['{"costUsd":0.5}', '{"costUsd":0.25}', ""], 1.5)).toBeCloseTo(0.75);
    expect(ledgerTotal(["broken", '{"costUsd":-1}', '{"x":1}'], 1.5)).toBeCloseTo(4.5);
  });
});

describe("mask", () => {
  it("作業フォルダ → ホーム → ユーザー名の順に伏せ、色の制御文字を消す", () => {
    const where = { root: "C:\\Users\\hanako\\dev\\ear-train\\T22", home: "C:\\Users\\hanako", user: "hanako" };
    const text = "\x1b[31mC:/Users/hanako/dev/ear-train/T22/worker/a.ts\x1b[0m C:\\Users\\Hanako\\x HANAKO";
    expect(mask(text, where)).toBe("<作業フォルダ>/worker/a.ts <ホーム>\\x <ユーザー>");
  });
});

describe("statusLine・notifyText", () => {
  it("理由は列挙だけ。パケットの id の形も見る", () => {
    expect(JSON.parse(statusLine(3, "T22", "stopped", "check"))).toEqual({ seq: 3, packet: "T22", state: "stopped", reason: "check" });
    expect(() => statusLine(1, "T22", "stopped", "C:/Users/x" as never)).toThrow(/知らない理由/);
    expect(() => statusLine(1, "../x", "stopped", "check")).toThrow(/id の形/);
  });

  it("ask・stopped・列車の停止と終了だけを通知し、green は通知しない", () => {
    expect(notifyText({ packet: "T22", state: "ask", reason: "ask" })).toContain("T22 を飛ばして続けて");
    expect(notifyText({ packet: "T06", state: "stopped", reason: "check" })).toBe("T06 停止: check。他は続行");
    expect(notifyText({ packet: null, state: "train", reason: "budget" })).toBe("列車停止: budget");
    expect(notifyText({ packet: null, state: "train", reason: "done" }, { green: 2, ask: 1, stopped: 0, usd: 2.1 })).toBe(
      "列車終了: GREEN 2／ask 1／stopped 0、$2.10",
    );
    expect(notifyText({ packet: "T22", state: "green", reason: "done" })).toBeNull();
  });

  it("通知は 200 字以内", () => {
    expect((notifyText({ packet: "T999", state: "ask", reason: "ask" }) ?? "").length).toBeLessThanOrEqual(200);
  });
});

describe("parseRunDayArgs", () => {
  it("--today・--skip（何回でも）・--prepare だけ", () => {
    expect(parseRunDayArgs(["--today", "1104", "--skip", "T06", "--skip", "T12"])).toEqual({ today: "1104", skip: ["T06", "T12"], prepare: false });
    expect(parseRunDayArgs(["--prepare", "--today", "1104"])).toEqual({ today: "1104", skip: [], prepare: true });
  });

  it.each([[[]], [["--today", "11-04"]], [["--today", "1104", "--queue", "x.json"]], [["--today", "1104", "--skip", "../x"]], [["--today", "1104", "--today", "1105"]]])(
    "%j はエラー",
    (argv) => {
      expect(() => parseRunDayArgs(argv)).toThrow(/--today/);
    },
  );
});

describe("tooManyWakes", () => {
  it("パケット数 + 3 を超えたら止める", () => {
    expect(tooManyWakes(6, 3)).toBe(false);
    expect(tooManyWakes(7, 3)).toBe(true);
  });
});
