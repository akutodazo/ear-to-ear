// 檻リレーの置き場（リポジトリの外）。docs/dev/harness-v0.6-relay.md §2
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** このスクリプトがある本体のチェックアウト（檻の server.mjs もここから動かす。CAGE_ROOT の外） */
export const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
/** 運用ファイル（待ち行列・state・ledger・ログ・STATUS・STOP）。C:\tmp は他のセッションの作業フォルダなので使わない */
export const BASE = join(process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local"), "ear-train");
/** パケットごとの worktree */
export const TREES = join(homedir(), "dev", "ear-train");
export const NPM_CLI = join(dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js");
export const CLAUDE =
  process.env.RELAY_CLAUDE ?? join(process.env.APPDATA ?? "", "npm", "node_modules", "@anthropic-ai", "claude-code", "bin", "claude.exe");
export const CAGE_SERVER = join(REPO, "scripts", "cage", "server.mjs");

export const paths = (today) => ({
  queue: join(BASE, "trains", `${today}.json`),
  state: join(BASE, "state", `${today}.json`),
  train: join(BASE, "state", `${today}-TRAIN.md`),
  ledger: join(BASE, `ledger-${today}.jsonl`),
  logs: join(BASE, "logs"),
  status: join(BASE, "STATUS.json"),
  usage: join(BASE, "usage.json"),
  stop: join(BASE, "STOP"),
  wakes: join(BASE, `wakes-${today}.json`),
  seen: join(BASE, "watch-seen.json"),
});

/** 手元の日付（JST の PC 前提）を MMDD に */
export function todayMMDD(now = new Date()) {
  return `${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
}

export function readJson(path, fallback) {
  try {
    return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : fallback;
  } catch {
    return fallback;
  }
}
