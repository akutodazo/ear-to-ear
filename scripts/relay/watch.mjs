// 通知係が背景で起動して待つ（ハーネス v0.6 §4）。STATUS（追記の列）に見ていない行が出たら、まとめて通知の本文を出して終わる。
// 待っている間は LLM を呼ばない。終了理由に関わらず最短 60 秒は待つ。起こした回数が多すぎたら STOP を書いて exit 2。
//   出力の最後の行: 「NOTIFY <本文>」か「QUIET」か「STOP」。exit 0＝起きた、2＝止める（何もしない）、3＝時間切れ（watch を起動し直す）
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { paths, readJson, todayMMDD } from "./paths.mjs";
import { joinNotices, ledgerTotal, notifyText, tooManyWakes, unseenStatus } from "./relay-lib.ts";

if (process.argv.length > 2) {
  console.error("引数は取らない");
  process.exit(2);
}
const today = todayMMDD();
const p = paths(today);
const write = (path, text) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
};
const lines = (path) => (existsSync(path) ? readFileSync(path, "utf8").split("\n") : []);

const wakes = (readJson(p.wakes, { n: 0 }).n ?? 0) + 1;
write(p.wakes, JSON.stringify({ n: wakes }));
const queue = readJson(p.queue, {});
const packets = Array.isArray(queue.packets) ? queue.packets.length : 0;
if (tooManyWakes(wakes, packets)) {
  write(p.stop, `watch: 起こした回数が上限を超えた（${wakes}）\n`);
  console.log("STOP");
  process.exit(2);
}
if (existsSync(p.stop)) {
  console.log("STOP");
  process.exit(2);
}

const seen = readJson(p.seen, { seq: 0 }).seq ?? 0;
const t0 = Date.now();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

for (;;) {
  await sleep(5_000);
  const { lastSeq, entries } = unseenStatus(lines(p.status), seen);
  if (entries.length > 0 && Date.now() - t0 >= 60_000) {
    write(p.seen, JSON.stringify({ seq: lastSeq }));
    const state = readJson(p.state, { packets: {} });
    const all = Object.values(state.packets ?? {});
    const summary = {
      green: all.filter((e) => e.state === "green").length,
      ask: all.filter((e) => e.state === "ask").length,
      stopped: all.filter((e) => e.state === "stopped").length,
      usd: ledgerTotal(lines(p.ledger), typeof queue.maxBudgetUsd === "number" ? queue.maxBudgetUsd : 0),
    };
    const texts = entries.map((e) => notifyText(e, e.state === "train" ? summary : undefined)).filter((t) => t !== null);
    const text = joinNotices(texts);
    for (const e of entries) console.log(JSON.stringify(e));
    console.log(text === null ? "QUIET" : `NOTIFY ${text}`);
    process.exit(0);
  }
  if (Date.now() - t0 > 5 * 3600_000) {
    console.log("QUIET");
    process.exit(3);
  }
}
