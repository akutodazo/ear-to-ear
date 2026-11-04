// L6 の引き継ぎメモを、本物の Claude で 1 回通す（本人が手元で実行する。Claude は実行しない。docs/dev/l6-live.md）。
//   node scripts/ops/l6-live.mjs                 … dev で ①〜⑥
//   node scripts/ops/l6-live.mjs --env demo      … demo で ①〜⑥
//   node scripts/ops/l6-live.mjs --url https://… … ⑤ だけ（デプロイ済みの環境で確かめ直す。手元の wrangler dev にも使える）
// ① Cloudflare にログイン（済みなら飛ばす）② D1 に表を作る（0002 まで。済みなら何もしない）
// ③ 秘密 CLAUDE_API_KEY が無ければ登録（キーを貼る）④ ビルドしてデプロイ
// ⑤ 管理者として 1 つの圃場の引き継ぎメモを作り、結果を表示 ⑥ ログアウト
// キーと合言葉は表示しない・ファイルに残さない・コマンドの引数に書かない（入力は画面に出さない）。
// 架空のデータしか入っていない環境で使う（K10）。⑤ は Claude の 1 日の回数を 1 つ使う。
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline";

const args = process.argv.slice(2);
const option = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const ENV = option("--env") ?? "dev";
const ONLY_URL = option("--url")?.replace(/\/+$/, "") ?? null;
if (ENV !== "dev" && ENV !== "demo") {
  console.error("--env は dev か demo");
  process.exit(2);
}
if (ONLY_URL !== null && !/^https?:\/\/[^\s/]+$/.test(ONLY_URL)) {
  console.error("--url は https://… の形（パスは付けない）");
  process.exit(2);
}
const SECRET_NAME = "CLAUDE_" + "API_KEY";
const WIN = process.platform === "win32";

/** 子のコマンド。capture なら出力を受け取る（画面にも出す）。そうでなければ画面と入力をそのままつなぐ */
function run(cmd, cmdArgs, { capture = false, allowFail = false } = {}) {
  const result = spawnSync(cmd, cmdArgs, {
    stdio: capture ? ["inherit", "pipe", "pipe"] : "inherit",
    encoding: "utf8",
    shell: WIN,
  });
  if (capture) {
    process.stdout.write(result.stdout ?? "");
    process.stderr.write(result.stderr ?? "");
  }
  if (result.status !== 0 && !allowFail) {
    console.error(`\n止まりました: ${cmd} ${cmdArgs.join(" ")}（終了コード ${result.status}）`);
    process.exit(1);
  }
  return { ok: result.status === 0, out: `${result.stdout ?? ""}${result.stderr ?? ""}` };
}

const wrangler = (...a) => ["wrangler", ...a];

function step(n, text) {
  console.log(`\n=== ${n}. ${text}（${ONLY_URL ?? ENV}） ===`);
}

/** ログアウト（--url だけのときはログインしていないので何もしない） */
function logout() {
  if (ONLY_URL === null) run("npx", wrangler("logout"), { allowFail: true });
}

function stop(message) {
  console.error(message);
  logout();
  process.exit(1);
}

/** 入力を画面に出さずに 1 行読む */
function askHidden(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    process.stdout.write(question);
    rl._writeToOutput = () => {}; // 打った文字を出さない
    rl.question("", (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer.trim());
    });
  });
}

let base = ONLY_URL;
if (base === null) {
  step(1, "Cloudflare のログイン");
  if (!run("npx", wrangler("whoami"), { capture: true, allowFail: true }).out.includes("associated with the email")) {
    run("npx", wrangler("login"));
  }

  step(2, "D1 に表を作る（0002_handover まで）");
  run("npx", wrangler("d1", "migrations", "apply", "DB", "--remote", "--env", ENV));

  step(3, `秘密 ${SECRET_NAME}`);
  const secrets = run("npx", wrangler("secret", "list", "--env", ENV), { capture: true, allowFail: true }).out;
  if (secrets.includes(`"${SECRET_NAME}"`)) {
    console.log("登録済みなので飛ばします");
  } else {
    console.log("Claude API のキーを貼って Enter を押してください（画面には出ません）");
    run("npx", wrangler("secret", "put", SECRET_NAME, "--env", ENV));
  }

  step(4, "ビルドしてデプロイ");
  run("npm", ["run", "build"]);
  const deploy = run("npx", wrangler("deploy", "--env", ENV), { capture: true }).out;
  base = deploy.match(/https:\/\/[a-z0-9.-]+\.workers\.dev/)?.[0] ?? null;
  if (base === null) stop("デプロイの出力から URL が読めませんでした。ここで止めます（デプロイは済んでいます）");
  console.log(`URL: ${base}`);
}

step(5, "本物の Claude で引き継ぎメモを 1 つ作る");
const summary = await (await fetch(`${base}/api/fields/summary`)).json();
const target = summary.fields?.find((f) => f.latest !== null);
if (!target) stop("判断が 1 件も無いので作れません。画面で判断を 1 つ残してから、もう一度実行してください");
const pass = await askHidden("管理者の合言葉: ");
const login = await fetch(`${base}/api/session`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ passphrase: pass }),
});
const cookie = login.headers.get("set-cookie")?.split(";")[0];
if (login.status !== 204 || !cookie) stop(`管理者として入れませんでした（${login.status}）。合言葉を確かめて、もう一度実行してください`);

const started = Date.now();
const res = await fetch(`${base}/api/fields/${target.fieldId}/handover`, { method: "POST", headers: { cookie } });
const seconds = ((Date.now() - started) / 1000).toFixed(1);
const body = await res.json().catch(() => null);
console.log(`圃場 ${target.fieldId}: ${res.status}（${seconds} 秒）`);
if (res.status === 200 && body) {
  const cited = body.blocks.filter((b) => b.cites.length > 0).length;
  const sentences = body.blocks.filter((b) => b.text.trim().length > 1).length;
  console.log(`要素 ${body.records.length}・ブロック ${body.blocks.length}・根拠つき ${cited} / ${sentences}`);
  console.log("--- メモ（[n] は根拠の要素の番号） ---");
  const mark = (c) => `[${c.start}${c.end - c.start > 1 ? `-${c.end - 1}` : ""}]`;
  console.log(body.blocks.map((b) => b.text + b.cites.map(mark).join("")).join(""));
  const again = await fetch(`${base}/api/fields/${target.fieldId}/handover`);
  console.log(`GET で読み直し: ${again.status}`);
} else {
  console.log(`応答: ${JSON.stringify(body)}`);
  if (res.status === 502) console.log("Claude の返事が読めませんでした。続くなら CLAUDE_ENABLED=false で止め、この画面の出力を先輩に見せてください");
  if (res.status === 503) console.log("Claude が止まっています（キーが無いか CLAUDE_ENABLED=false）");
}

if (ONLY_URL === null) {
  step(6, "ログアウト");
  logout();
}
console.log("\n終わりました。この画面の「=== 5.」から下を先輩に見せてください（合言葉とキーは出ていません）");
