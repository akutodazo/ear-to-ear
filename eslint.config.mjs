import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Claude Code の worktree。中の build 生成物まで読むと手元の検査が落ちる
    ".claude/**",
    // wrangler dev の生成物（.wrangler/tmp の bundle）。自分のコードではない
    ".wrangler/**",
  ]),
]);

export default eslintConfig;
