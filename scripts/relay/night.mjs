// 夜番の準備と回収（ハーネス v0.6 §6）。夜のセッションは対象のコードを埋め込んだワークフローを 1 回だけ回し、報告を書いて終わる。
//   node scripts/relay/night.mjs --prepare small   … 寝る前に人が。clone・対象・ワークフロー・起動コマンドを用意する
//   node scripts/relay/night.mjs --collect         … 朝に人が。報告をリポジトリの外に写し、先頭だけを出す
// 同じ日に 2 回は準備しない（lock）。clone は main だけ（run ブランチの REPORT を入れない）、docs/run を消す。
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { BASE, REPO, todayMMDD } from "./paths.mjs";

const git = (...args) => execFileSync("git", args, { cwd: REPO, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 32 * 1024 * 1024 });
const today = todayMMDD();
const dir = join(BASE, "night", today);
const clone = join(dir, "clone");
const lock = join(dir, "lock");
const MAX_FILE = 30 * 1024;
const MAX_TOTAL = 160 * 1024;
const TARGET = /^(src|worker)\/.+\.tsx?$/;

function isoDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/** 当日 main に入った差分と、当日の run ブランチの差分（テストを除く .ts・.tsx） */
function targets(size) {
  const files = [];
  const dropped = [];
  let total = 0;
  const add = (path, ref) => {
    if (!TARGET.test(path) || /\.test\.tsx?$/.test(path) || files.some((f) => f.path === path)) return;
    let text;
    try {
      text = git("show", `${ref}:${path}`);
    } catch {
      return; // 消えたファイル
    }
    if (text.length > MAX_FILE || total + text.length > MAX_TOTAL) {
      dropped.push(path);
      return;
    }
    total += text.length;
    files.push({ path, ref, text });
  };
  const commits = git("rev-list", "main", "--first-parent", `--since=${isoDate()} 00:00 +0900`).split("\n").filter(Boolean);
  if (commits.length > 0) {
    const first = commits[commits.length - 1];
    const base = git("rev-list", "--max-parents=0", "main").split("\n")[0] === first ? first : `${first}^`;
    for (const path of git("diff", "--name-only", `${base}..main`).split("\n").filter(Boolean)) add(path, "main");
  }
  for (const branch of git("for-each-ref", "--format=%(refname:short)", `refs/heads/run/${today}-*`).split("\n").filter(Boolean)) {
    for (const path of git("diff", "--name-only", `main...${branch}`).split("\n").filter(Boolean)) add(path, branch);
  }
  return { date: isoDate(), size, files, dropped };
}

const [mode, size = "small"] = process.argv.slice(2);
if (mode === "--prepare" && (size === "small" || size === "medium") && process.argv.length <= 4) {
  if (existsSync(lock)) {
    console.error("今日の夜番はもう準備した（lock）。2 周目はしない");
    process.exit(2);
  }
  mkdirSync(dir, { recursive: true });
  rmSync(clone, { recursive: true, force: true }); // 前の準備が途中で失敗した残り（レビュー #11）
  execFileSync("git", ["clone", "-q", "--depth", "1", "--branch", "main", "--single-branch", `file://${REPO.replaceAll("\\", "/")}`, clone]);
  rmSync(join(clone, "docs", "run"), { recursive: true, force: true });
  const t = targets(size);
  const template = readFileSync(join(REPO, "scripts", "relay", "night-review.workflow.template.mjs"), "utf8");
  const script = join(dir, `night-review-${today}.workflow.mjs`);
  writeFileSync(script, template.replace("/*TARGETS*/ null", () => JSON.stringify(t))); // 文字列だと writeFileSync(script, template.replace("/*TARGETS*/ null", JSON.stringify(t))); などが効く（PR #88 のレビュー #5）
  writeFileSync(lock, new Date().toISOString());
  const prompt = readFileSync(join(REPO, "scripts", "relay", "NIGHT.txt"), "utf8").replaceAll("<SCRIPT>", () => script.replaceAll("\\", "/"));
  writeFileSync(join(dir, "PROMPT.txt"), prompt);
  const budget = size === "medium" ? "5" : "2";
  console.log(`対象 ${t.files.length} ファイル（外した ${t.dropped.length}）: ${t.files.map((f) => f.path).join(", ")}`);
  console.log("\n起動（clone の中で。PC はスリープさせない）:");
  console.log(
    `cd "${clone}" && claude -p "$(cat ../PROMPT.txt)" --model sonnet --allowedTools Workflow "Write(night-report.md)" --disallowedTools Read Grep Glob Edit Bash WebFetch WebSearch Agent PushNotification --setting-sources project --no-session-persistence --max-budget-usd ${budget} --output-format json > ../result.json`,
  );
} else if (mode === "--collect" && process.argv.length === 3) {
  const report = join(clone, "night-report.md");
  if (!existsSync(report)) {
    console.error("報告が無い（夜番が失敗したか、まだ終わっていない）。../result.json を見る");
    process.exit(2);
  }
  const out = join(BASE, "reviews", `night-${today}.md`);
  mkdirSync(join(BASE, "reviews"), { recursive: true });
  copyFileSync(report, out);
  console.log(`写した: ${out}\n`);
  console.log(readFileSync(out, "utf8").split("\n").slice(0, 25).join("\n"));
} else {
  console.error("使い方: --prepare small|medium か --collect");
  process.exit(2);
}
