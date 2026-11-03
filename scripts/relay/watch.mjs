// 通知係が背景で起動して待つ（ハーネス v0.6 §4）。STATUS.json の seq が増えたら、最後の 1 行と通知の本文を出して終わる。
// 待っている間は LLM を呼ばない。終了理由に関わらず最短 60 秒は待つ。起こした回数が多すぎたら STOP を書いて exit 2。
//   出力の最後の行: 「NOTIFY <本文>」か「QUIET」。exit 0＝起きた、2＝止める（何もしない）、3＝時間切れ（watch を起動し直す）
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { paths, readJson, todayMMDD } from "./paths.mjs";
import { notifyText, tooManyWakes } from "./relay-lib.ts";

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

const wakes = (readJson(p.wakes, { n: 0 }).n ?? 0) + 1;
write(p.wakes, JSON.stringify({ n: wakes }));
const packets = Array.isArray(readJson(p.queue, {}).packets) ? readJson(p.queue, {}).packets.length : 0;
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
  let status = null;
  try {
    status = JSON.parse(readFileSync(p.status, "utf8"));
  } catch {
    status = null;
  }
  const elapsed = Date.now() - t0;
  if (status && typeof status.seq === "number" && status.seq > seen && elapsed >= 60_000) {
    write(p.seen, JSON.stringify({ seq: status.seq }));
    let summary;
    if (status.state === "train") {
      const state = readJson(p.state, { packets: {} });
      const entries = Object.values(state.packets ?? {});
      const ledger = existsSync(p.ledger) ? readFileSync(p.ledger, "utf8").split("\n").filter(Boolean) : [];
      summary = {
        green: entries.filter((e) => e.state === "green").length,
        ask: entries.filter((e) => e.state === "ask").length,
        stopped: entries.filter((e) => e.state === "stopped").length,
        usd: ledger.reduce((s, l) => s + (Number(JSON.parse(l).costUsd) || 0), 0),
      };
    }
    const text = notifyText(status, summary);
    console.log(JSON.stringify(status));
    console.log(text === null ? "QUIET" : `NOTIFY ${text}`);
    process.exit(0);
  }
  if (elapsed > 5 * 3600_000) {
    console.log("QUIET");
    process.exit(3);
  }
}
