/**
 * L6 の 2 段目（docs/spec.md §3・K17、T28 #105）。Claude API の引用（Citations）の返事の content を、
 * HandoverNote の blocks に写す。引用は要素の番号の範囲（end は含まない）で、T27 の records の添字を指す。
 * 範囲外・document_index が 0 以外・種類の違う引用は捨てる。引用の無いブロックは cites が空（画面で「根拠なし」）。
 */
import type { HandoverNote } from "@/types";

export type HandoverBlock = HandoverNote["blocks"][number];

type HandoverCite = HandoverBlock["cites"][number];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function shapeError(detail: string): Error {
  return new Error(`返事の形が違う: ${detail}`);
}

/** 1 つの引用を写す。捨てるものは null */
function toCite(value: unknown, recordCount: number): HandoverCite | null {
  if (!isObject(value)) return null;
  if (value.type !== "content_block_location") return null;
  if (value.document_index !== 0) return null;
  const citedText = value.cited_text;
  const start = value.start_block_index;
  const end = value.end_block_index;
  if (typeof citedText !== "string") return null;
  if (typeof start !== "number" || !Number.isInteger(start)) return null;
  if (typeof end !== "number" || !Number.isInteger(end)) return null;
  if (!(0 <= start && start < end && end <= recordCount)) return null;
  return { start, end, citedText };
}

/**
 * 返事の content（JSON から読んだまま）を blocks にする。text 以外のブロックは捨てる。
 * 形が違う（配列でない・text が文字列でない・citations が配列でない・text のブロックが 1 つも無い）なら例外
 */
export function toHandoverBlocks(content: unknown, recordCount: number): HandoverBlock[] {
  if (!Array.isArray(content)) throw shapeError("content が配列でない");
  const blocks: HandoverBlock[] = [];
  for (const block of content) {
    if (!isObject(block)) throw shapeError("ブロックがオブジェクトでない");
    if (typeof block.type !== "string") throw shapeError("ブロックの type が文字列でない");
    if (block.type !== "text") continue;
    if (typeof block.text !== "string") throw shapeError("text が文字列でない");
    const citations = block.citations;
    const cites: HandoverCite[] = [];
    if (Array.isArray(citations)) {
      for (const citation of citations) {
        const cite = toCite(citation, recordCount);
        if (cite !== null) cites.push(cite);
      }
    } else if (citations !== undefined && citations !== null) {
      throw shapeError("citations が配列でない");
    }
    blocks.push({ text: block.text, cites });
  }
  if (blocks.length === 0) throw shapeError("text のブロックが無い");
  return blocks;
}
