// 列車を止める合図（STOP ファイル）を置く。進行役は次のパケットの前に見て止まる。走っている 1 本は殺さない。
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { paths, todayMMDD } from "./paths.mjs";

if (process.argv.length > 2) {
  console.error("引数は取らない");
  process.exit(2);
}
const p = paths(todayMMDD());
mkdirSync(dirname(p.stop), { recursive: true });
writeFileSync(p.stop, "stop.mjs\n");
console.log("STOP を置いた（次のパケットの前に止まる）");
