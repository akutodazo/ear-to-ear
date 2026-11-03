// 役ごとに、許可したファイルだけを空のフォルダに置いて文面を作る（#16）。一覧は docs/dev/roles.md
// 指示で無視させることはできないので、知らせないものは物理的に置かない。文面は固定で、経緯を足す引数は作らない。
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { stubImpl } from "./stub-impl.mjs";

const git = (...args) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const show = (path) => git("show", `HEAD:${path}`);

function put(work, path, content) {
  mkdirSync(dirname(join(work, path)), { recursive: true });
  writeFileSync(join(work, path), content);
}

const ROLES = {
  attacker: {
    args: ["impl", "test"],
    prompt: ({ impl, test }) =>
      `テストの強さの監査です。${test} を読み、${impl} だけを書き換えて、最小のズルでテストを全件通してください。正しい実装は目的ではありません。固定値・場合分け・入力の一部だけを見るなどの手抜きを使ってください。通ったら、どんな手抜きで通ったかと、足すべきテストを報告してください。通せなければ、何に縛られたかを報告してください。テストは変えないでください。`,
    fill(work, { impl, test }) {
      const stub = stubImpl(show(impl));
      put(work, impl, stub);
      put(work, test, show(test));
      for (const shared of ["src/types/index.ts", "src/config.ts"]) put(work, shared, show(shared));
    },
  },
  reviewer: {
    args: ["pr"],
    prompt: ({ pr }) => `PR #${pr} をレビューしてください。AGENTS.md と docs/spec.md を読んでから見てください。`,
    check: ({ pr }) => /^\d+$/.test(pr),
    fill(work) {
      execFileSync("git", ["clone", "-q", "--depth", "1", `file://${resolve(".")}`, work], { stdio: "pipe" });
    },
  },
  committee: {
    args: ["memo"],
    prompt: () =>
      "あなたは来年の収穫委員会の委員です。手元にあるのは memo.md だけです。これを読んで、次に何を確かめるかを書いてください。メモに無いことは推測せず「メモからは分からない」と書いてください。",
    fill(work, { memo }) {
      mkdirSync(work, { recursive: true });
      copyFileSync(memo, join(work, "memo.md"));
    },
  },
  human: {
    args: ["questions"],
    prompt: () =>
      "あなたは、人のいない間に Claude がコードを実装した作業の報告を読む人の役です。手元にあるのは QUESTIONS.md だけです。何が起きたか、選択肢、推奨が読み取れるか、これだけで判断できるかを答えてください。足りないものを挙げてください。運転の再開は指示しないでください。",
    fill(work, { questions }) {
      mkdirSync(work, { recursive: true });
      copyFileSync(questions, join(work, "QUESTIONS.md"));
    },
  },
};

function main() {
  const [name, ...rest] = process.argv.slice(2);
  const role = Object.hasOwn(ROLES, name ?? "") ? ROLES[name] : null;
  if (!role) throw new Error(`知らない役: ${name}（${Object.keys(ROLES).join("・")}）`);

  const options = { out: { type: "string" } };
  for (const arg of role.args) options[arg] = { type: "string" };
  const { values } = parseArgs({ args: rest, options });
  for (const key of ["out", ...role.args]) {
    if (!values[key]) throw new Error(`--${key} が要る`);
  }
  if (role.check && !role.check(values)) throw new Error("引数の形が違う");

  const out = resolve(values.out);
  if (existsSync(out) && readdirSync(out).length > 0) throw new Error(`空でないフォルダ: ${out}`);

  const prompt = role.prompt(values);
  role.fill(join(out, "work"), values);
  writeFileSync(join(out, "PROMPT.txt"), prompt);
  console.log(join(out, "work"));
}

try {
  main();
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
