// 檻の判定（#14）。fs・git に触らない純粋関数だけを置く。
// 誤操作の経路を消すためのもの。悪意のあるコードを防ぐ保証ではない（docs/dev/cage.md の既知の抜け）。
import { normalize } from "node:path";

export function cleanPath(path) {
  return normalize(String(path)).replaceAll("\\", "/");
}

export function checkWrite(path, allow) {
  return typeof path === "string" && path !== "" && allow.has(cleanPath(path));
}

export function checkCommitMessage(message) {
  return /^T\d+ GREEN: \S[^\n]*$/.test(message);
}

export function checkPurity() {
  throw new Error("not implemented");
}
