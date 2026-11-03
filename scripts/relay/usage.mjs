// 使用量を usage.json に書く（通知係が get_usage の値を、人が朝に前夜の値を）。数だけを受け取る。
//   node scripts/relay/usage.mjs --weekly 22 --five 10
//   node scripts/relay/usage.mjs --night-before 20
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { paths, readJson, todayMMDD } from "./paths.mjs";

const p = paths(todayMMDD());
const keys = { "--weekly": "weekly", "--five": "fiveHour", "--night-before": "nightBefore" };
const argv = process.argv.slice(2);
const usage = readJson(p.usage, {});
if (argv.length === 0 || argv.length % 2 !== 0) {
  console.error("引数は --weekly N・--five N・--night-before N の組だけ");
  process.exit(2);
}
for (let i = 0; i < argv.length; i += 2) {
  const key = keys[argv[i]];
  const n = Number(argv[i + 1]);
  if (!key || !/^\d{1,3}$/.test(argv[i + 1]) || n > 100) {
    console.error("引数は --weekly N・--five N・--night-before N の組だけ（N は 0〜100）");
    process.exit(2);
  }
  usage[key] = n;
}
if (argv.includes("--weekly") || argv.includes("--five")) usage.readAt = new Date().toISOString();
mkdirSync(dirname(p.usage), { recursive: true });
writeFileSync(p.usage, JSON.stringify(usage));
console.log(JSON.stringify(usage));
