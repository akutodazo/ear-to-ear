// 公開リポジトリの安全検査（npm run check:safety、docs/spec.md §10、T17）。
// 対象はコミットされた全ファイル（git ls-files）。.gitignore 済みの /private/ などは見ない。
// 判定は scripts/safety-rules.ts（純粋関数）。ここはファイルを集めて読み、結果を出すだけ。
// 見つけた秘密の「値」は出さない（ファイル名・行・種類だけ）。
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { checkDemoJpeg, checkFieldsArea, checkFileName, findSecretLikeLines } from "./safety-rules.ts";
import { inspectJpeg } from "../src/services/jpeg-segments.ts";
import { FICTIONAL_AREA } from "../src/config.ts";

const FIELDS_PATH = "src/data/fields.json";
const SECRET_KINDS = {
  "anthropic-key": "API キーの形",
  "secret-assignment": "秘密の名前に値を入れている",
  "private-key": "秘密鍵",
};

const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean)
  // 消したがまだコミットしていないファイルは読めないので飛ばす
  .filter((f) => existsSync(f));

/** バイト列に NUL があれば文字のファイルではないとみなす（画像・フォントなど） */
function isBinary(bytes) {
  return bytes.subarray(0, 8000).includes(0);
}

const hits = [];
for (const f of files) {
  const nameReason = checkFileName(f);
  if (nameReason !== null) {
    hits.push(`${f}  ← ${nameReason}`);
    continue;
  }
  const bytes = readFileSync(f);

  if (/^public\/demo\/.*\.jpe?g$/i.test(f)) {
    const reason = checkDemoJpeg(new Uint8Array(bytes), inspectJpeg);
    if (reason !== null) hits.push(`${f}  ← ${reason}`);
    continue;
  }
  if (isBinary(bytes)) continue;

  const text = bytes.toString("utf8");
  for (const hit of findSecretLikeLines(text)) {
    hits.push(`${f}:${hit.line}  ← 秘密らしい文字列（${SECRET_KINDS[hit.kind]}）`);
  }
  if (f === FIELDS_PATH) {
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      hits.push(`${f}  ← JSON として読めない`);
      continue;
    }
    for (const reason of checkFieldsArea(data, FICTIONAL_AREA)) hits.push(`${f}  ← ${reason}`);
  }
}

console.log(`check:safety: ${files.length} ファイルを確認`);
if (hits.length > 0) {
  console.error("check:safety: 入れてはいけないものがあります（値は表示しません）");
  for (const h of hits) console.error("  " + h);
  process.exit(1);
}
console.log("check:safety: OK（名前・デモの JPEG・圃場の座標・秘密らしい文字列）");
