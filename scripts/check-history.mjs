// 提出前の履歴全体の安全検査（合格条件 10「提出前に履歴全体の検査」、docs/dev/final-review.md）。
// 今の安全検査（check-safety.mjs）は今あるファイルだけを見る。これは、すべてのコミットに一度でも入ったファイル（blob）を、
// 同じ判定（scripts/safety-rules.ts）で見る。対象は git rev-list --objects --all（手元の枝と origin の枝の全部）。
// 見つけた秘密の「値」は出さない（コミットに入っていた道・種類だけ）。
// 圃場の座標は、版によって範囲が違う（11-02 の沖合の四角 → 11-04 夜に空知へ）ので、どちらかの範囲の中なら通す。
import { execFileSync, spawnSync } from "node:child_process";
import {
  checkDemoJpeg,
  checkFieldsArea,
  checkFileName,
  decodeText,
  findSecretLikeLines,
  looksLikeJpeg,
} from "./safety-rules.ts";
import { inspectJpeg } from "../src/services/jpeg-segments.ts";
import { FICTIONAL_AREA } from "../src/config.ts";

const FIELDS_PATH = "src/data/fields.json";
/** 11-02 の決定（P15）の範囲。11-04 夜に今の FICTIONAL_AREA（空知）へ移した */
const OLD_FICTIONAL_AREA = { latMin: 41.8, latMax: 41.815, lngMin: 144.5, lngMax: 144.52 };
const SECRET_KINDS = {
  "anthropic-key": "API キーの形",
  "cloudflare-token": "Cloudflare のトークンの形",
  "secret-assignment": "秘密の名前に値を入れている",
  "private-key": "秘密鍵",
};

// blob ごとに、入っていた道を 1 つ以上（同じ中身が別の道にあれば全部）
const objects = execFileSync("git", ["rev-list", "--objects", "--all"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
  .split("\n")
  .filter(Boolean);
const pathsByObject = new Map();
for (const line of objects) {
  const space = line.indexOf(" ");
  if (space < 0) continue; // コミット（道が無い）
  const sha = line.slice(0, space);
  const path = line.slice(space + 1);
  if (!pathsByObject.has(sha)) pathsByObject.set(sha, new Set());
  pathsByObject.get(sha).add(path);
}

// 木（ディレクトリ）は飛ばし、blob だけを読む
const types = execFileSync("git", ["cat-file", "--batch-check=%(objectname) %(objecttype)"], {
  input: [...pathsByObject.keys()].join("\n") + "\n",
  encoding: "utf8",
  maxBuffer: 64 * 1024 * 1024,
});
const blobs = types
  .split("\n")
  .filter((l) => l.endsWith(" blob"))
  .map((l) => l.slice(0, l.indexOf(" ")));

function readBlob(sha) {
  const r = spawnSync("git", ["cat-file", "blob", sha], { maxBuffer: 256 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`blob を読めない: ${sha}`);
  return new Uint8Array(r.stdout);
}

const hits = [];
let checked = 0;
for (const sha of blobs) {
  const paths = [...pathsByObject.get(sha)];
  const at = (p) => `${p}（${sha.slice(0, 10)}）`;
  const nameHits = paths.map((p) => [p, checkFileName(p)]).filter(([, r]) => r !== null);
  for (const [p, reason] of nameHits) hits.push(`${at(p)}  ← ${reason}`);
  if (nameHits.length === paths.length) continue;
  const bytes = readBlob(sha);
  checked += 1;

  if (looksLikeJpeg(bytes)) {
    for (const p of paths) {
      const reason = p.toLowerCase().startsWith("public/demo/")
        ? checkDemoJpeg(bytes, inspectJpeg)
        : "中身が JPEG（画像は public/demo/ にだけ置く）";
      if (reason !== null) hits.push(`${at(p)}  ← ${reason}`);
    }
    continue;
  }
  const text = decodeText(bytes);
  if (text === null) continue;
  for (const hit of findSecretLikeLines(text)) {
    hits.push(`${at(paths[0])}:${hit.line}  ← 秘密らしい文字列（${SECRET_KINDS[hit.kind]}）`);
  }
  if (paths.includes(FIELDS_PATH)) {
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      continue; // 書きかけの版は形を問わない（座標が無ければ漏れも無い）
    }
    const now = checkFieldsArea(data, FICTIONAL_AREA);
    const old = checkFieldsArea(data, OLD_FICTIONAL_AREA);
    if (now.length > 0 && old.length > 0) for (const reason of now) hits.push(`${at(FIELDS_PATH)}  ← ${reason}（11-02 の範囲の外でもある）`);
  }
}

const commits = execFileSync("git", ["rev-list", "--all", "--count"], { encoding: "utf8" }).trim();
console.log(`check:history: コミット ${commits}・ファイルの版 ${blobs.length}（中身を読んだもの ${checked}）を確認`);
if (hits.length > 0) {
  console.error("check:history: 入れてはいけないものが履歴にあります（値は表示しません）");
  for (const h of hits) console.error("  " + h);
  process.exit(1);
}
console.log("check:history: OK（名前・デモの JPEG・圃場の座標・秘密らしい文字列。履歴のすべての版）");
