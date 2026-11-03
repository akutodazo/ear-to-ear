import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const HOOK = resolve("scripts/hooks/ask-before-edit.mjs");
const ROOT = resolve("/repo");

function run(stdin: string) {
  return spawnSync("node", [HOOK], {
    input: stdin,
    encoding: "utf8",
    env: { ...process.env, CLAUDE_PROJECT_DIR: ROOT },
  });
}

function edit(path: string, tool = "Edit") {
  return run(JSON.stringify({ tool_name: tool, tool_input: { file_path: path }, cwd: ROOT }));
}

describe("対象の編集", () => {
  it.each([
    "src/lib/resize.ts",
    "src/app/page.tsx",
    "src/components/map.tsx",
    "src/hooks/use-upload.ts",
    "src/services/candidates.ts",
    "src/repositories/implementations/photo.ts",
    "worker/index.ts",
  ])("%s の編集の直前に K1・K6 の問いが文脈に入る", (path) => {
    const r = edit(resolve(ROOT, path));
    expect(r.status).toBe(0);
    const out = JSON.parse(r.stdout);
    expect(out.hookSpecificOutput.hookEventName).toBe("PreToolUse");
    expect(out.hookSpecificOutput.additionalContext).toMatch(/委員の手間は増えるか/);
    expect(out.hookSpecificOutput.additionalContext).toMatch(/撮影位置が外に出る経路は増えるか/);
  });

  it("Write でも問いが入る", () => {
    const r = edit(resolve(ROOT, "src/lib/resize.ts"), "Write");
    expect(JSON.parse(r.stdout).hookSpecificOutput.additionalContext).toMatch(/K6/);
  });
});

describe("問いだけで止めない", () => {
  it("編集の許可・拒否を決めない", () => {
    const r = edit(resolve(ROOT, "src/lib/resize.ts"));
    expect(r.status).toBe(0);
    expect(JSON.parse(r.stdout).hookSpecificOutput.permissionDecision).toBeUndefined();
  });
});

describe("対象外の編集", () => {
  it.each([
    "docs/spec.md",
    "README.md",
    "scripts/check-safety.mjs",
    "src/types/index.ts",
    "src/config.ts",
    "src/lib-old/x.ts",
    "../other/src/lib/x.ts",
  ])("%s では何も出さない", (path) => {
    const r = edit(resolve(ROOT, path));
    expect(r.status).toBe(0);
    expect(r.stdout).toBe("");
  });
});

describe("壊れた入力でも編集を妨げない", () => {
  it.each(["", "{", "null", "{}", '{"tool_input":{}}', '{"tool_input":{"file_path":3}}'])("%s", (stdin) => {
    const r = run(stdin);
    expect(r.status).toBe(0);
    expect(r.stdout).toBe("");
  });
});
