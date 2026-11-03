// 檻リレーの置き場（リポジトリの外）。docs/dev/harness-v0.6-relay.md §2・§11
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** このスクリプトがある本体のチェックアウト（檻の server.mjs もここから動かす。CAGE_ROOT の外） */
export const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
/** パケットごとの worktree */
export const TREES = join(homedir(), "dev", "ear-train");
/**
 * 運用ファイル（待ち行列・state・ledger・ログ・STATUS・STOP）。
 * %LOCALAPPDATA% はデスクトップアプリから起動したプロセスだと別の場所に振り替えられ、ターミナルから起動したものと
 * 置き場がずれる（11-04 に分かった）。C:\tmp は他のセッションの作業フォルダ。だからホームの下に置く
 */
export const BASE = join(TREES, "ops");
export const NPM_CLI = join(dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js");
export const CLAUDE =
  process.env.RELAY_CLAUDE ?? join(process.env.APPDATA ?? "", "npm", "node_modules", "@anthropic-ai", "claude-code", "bin", "claude.exe");
export const CAGE_SERVER = join(REPO, "scripts", "cage", "server.mjs");

export const paths = (today) => ({
  queue: join(BASE, "trains", `${today}.json`),
  state: join(BASE, "state", `${today}.json`),
  stateDir: join(BASE, "state"),
  train: join(BASE, "state", `${today}-TRAIN.md`),
  ledger: join(BASE, `ledger-${today}.jsonl`),
  logs: join(BASE, "logs"),
  /** 1 行 1 件の追記（watch は見ていない行をまとめて読む） */
  status: join(BASE, `status-${today}.jsonl`),
  usage: join(BASE, "usage.json"),
  /** 日付ごと（前の日の STOP が次の日の列車を止めない） */
  stop: join(BASE, `STOP-${today}`),
  /** 進行役が走っている印（二重起動を断る） */
  running: join(BASE, `running-${today}.json`),
  wakes: join(BASE, `wakes-${today}.json`),
  seen: join(BASE, `watch-seen-${today}.json`),
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

/** プロセスが生きているか（signal 0） */
export function alive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
