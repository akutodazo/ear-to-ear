// 公開リポジトリの安全検査（npm run check:safety）。
// いまは「名前で分かる危ないファイル」だけを見る。画像の APP1〜15・座標の範囲・合言葉らしい文字列の検出は T17 で足す。
// 対象はコミットされた全ファイル（git ls-files）。.gitignore 済みの /private/ などは見ない。
import { execFileSync } from "node:child_process";

const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);

const forbidden = [
  { test: (f) => /(^|\/)\.dev\.vars(\.|$)/.test(f), why: "開発用の秘密（.dev.vars）" },
  { test: (f) => /(^|\/)\.env(\.|$)/.test(f), why: "環境変数ファイル（.env*）" },
  { test: (f) => /\.csv$/i.test(f), why: "CSV（番号対応表などの実データの疑い）" },
  { test: (f) => /^private\//.test(f), why: "/private/ の中身" },
  { test: (f) => /\.(jpe?g|heic|dng)$/i.test(f), why: "写真ファイル（テストはバイト列を組み立てる。画像はコミットしない）" },
];

const hits = [];
for (const f of files) {
  for (const rule of forbidden) {
    if (rule.test(f)) hits.push(`${f}  ← ${rule.why}`);
  }
}

console.log(`check:safety: ${files.length} ファイルを確認`);
if (hits.length > 0) {
  console.error("check:safety: 入れてはいけないファイルがあります");
  for (const h of hits) console.error("  " + h);
  process.exit(1);
}
console.log("check:safety: OK（名前の検査のみ。中身の検査は T17）");
