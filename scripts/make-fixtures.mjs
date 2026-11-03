// 合成写真（T10、docs/spec.md §10）を /private/fixtures/ に書き出す。コミットしない（.gitignore 済み）。
// 実行: node scripts/make-fixtures.mjs   （毎回作り直す。同じ中身になる）
// 組み立ては scripts/fixtures/fixture-catalog.ts（純粋関数）。ここは書き出しと README だけ。
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { encodeJpeg } from "./fixtures/jpeg-encoder.ts";
import { buildFixtures } from "./fixtures/fixture-catalog.ts";

const OUT = join("private", "fixtures");

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const fixtures = buildFixtures((image) => encodeJpeg(image));
const lines = [
  "合成写真（T10）。架空のデータだけ。コミットしない。作り直し: node scripts/make-fixtures.mjs",
  "",
  "| ファイル | 大きさ | 候補の一番目 | 撮影日 | 何を確かめるか |",
  "|---|---|---|---|---|",
];
for (const f of fixtures) {
  writeFileSync(join(OUT, f.name), f.bytes);
  const nearest = f.expect.broken ? "（送れない）" : (f.expect.nearestFieldId ?? "なし");
  const takenAt = f.expect.broken ? "—" : (f.expect.takenAt ?? "日付不明");
  lines.push(`| ${f.name} | ${Math.round(f.bytes.length / 1024)}KB | ${nearest} | ${takenAt} | ${f.purpose} |`);
  console.log(`make-fixtures: ${f.name}（${Math.round(f.bytes.length / 1024)}KB）`);
}
writeFileSync(join(OUT, "README.md"), `${lines.join("\n")}\n`);
console.log(`make-fixtures: ${fixtures.length} 枚を ${OUT} に書き出した`);
