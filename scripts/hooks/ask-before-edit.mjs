// PreToolUse フック（#18）。作品のコードを編集する直前に、K1・K6 の問いを Claude の文脈に差し込む。
// 止めるのは #12 の担当。ここは問いだけで、どんな入力でも編集を妨げない。
import { readFileSync } from "node:fs";
import { relative, sep } from "node:path";

const TARGETS = [
  "src/app/",
  "src/components/",
  "src/hooks/",
  "src/lib/",
  "src/repositories/",
  "src/services/",
  "worker/",
];

const QUESTIONS = [
  "この編集を書く前に確かめる。",
  "K1: 委員の手間は増えるか（委員は送るだけ。LINE より増やさない）。",
  "K6: 撮影位置が外に出る経路は増えるか（座標も候補までの距離も送らない・保存しない）。",
].join("\n");

function input() {
  try {
    return JSON.parse(readFileSync(0, "utf8"));
  } catch {
    return null;
  }
}

const event = input();
const path = event?.tool_input?.file_path;
if (typeof path === "string") {
  const root = process.env.CLAUDE_PROJECT_DIR ?? event.cwd ?? process.cwd();
  const rel = relative(root, path).split(sep).join("/");
  if (TARGETS.some((t) => rel.startsWith(t))) {
    console.log(
      JSON.stringify({
        hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: QUESTIONS },
      }),
    );
  }
}
