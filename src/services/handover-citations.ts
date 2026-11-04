/**
 * L6 の 2 段目（docs/spec.md §3・K17、T28 #105）。Claude API の引用（Citations）の返事の content を、
 * HandoverNote の blocks に写す。引用は要素の番号の範囲（end は含まない）で、T27 の records の添字を指す。
 * 範囲外・document_index が 0 以外・種類の違う引用は捨てる。引用の無いブロックは cites が空（画面で「根拠なし」）。
 */
import type { HandoverNote } from "@/types";

export type HandoverBlock = HandoverNote["blocks"][number];

/**
 * 返事の content（JSON から読んだまま）を blocks にする。text 以外のブロックは捨てる。
 * 形が違う（配列でない・text が文字列でない・citations が配列でない・text のブロックが 1 つも無い）なら例外
 */
export function toHandoverBlocks(_content: unknown, _recordCount: number): HandoverBlock[] {
  throw new Error("未実装");
}
