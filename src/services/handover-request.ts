/**
 * L6 の Claude への要求と返事の判定（docs/spec.md §6・K17、T30 #107）。純粋関数。
 * 要求: T27 の要素を、引用を有効にしたカスタムコンテンツの 1 文書として渡す（Messages API、SDK は使わない）。
 * 返事: 200 で最後まで書き終えたものだけを T28 で blocks に写す。それ以外は失敗（T31 で 502、保存しない）。
 */
import { CLAUDE_MAX_TOKENS, CLAUDE_MODEL } from "@/config";
import type { HandoverRecord } from "@/types";
import { toHandoverBlocks } from "./handover-citations";
import type { HandoverBlock } from "./handover-citations";
import { handoverContent } from "./handover-document";
import { HANDOVER_SYSTEM_PROMPT, HANDOVER_USER_TEXT } from "./handover-prompt";

/** POST /v1/messages の本文（JSON にして送る） */
export interface HandoverRequestBody {
  model: string;
  max_tokens: number;
  thinking: { type: "between_tools" };
  system: string;
  messages: [
    {
      role: "user";
      content: [
        {
          type: "document";
          source: { type: "content"; content: { type: "text"; text: string }[] };
          title: string;
          citations: { enabled: true };
        },
        { type: "text"; text: string },
      ];
    },
  ];
}

export type HandoverReply =
  | { ok: true; blocks: HandoverBlock[] }
  /** http: 200 でない／refusal: 断られた／truncated: max_tokens で切れた／shape: 形が違う・最後まで書いていない */
  | { ok: false; reason: "http" | "refusal" | "truncated" | "shape" };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * その圃場・シーズンの要素から要求の本文を作る。records が空なら例外（呼ぶ側は 422 で Claude を呼ばない）
 */
export function buildHandoverRequest(
  fieldId: string,
  season: string,
  records: readonly HandoverRecord[],
): HandoverRequestBody {
  if (records.length === 0) {
    throw new Error("記録が無いので要求を作らない");
  }
  return {
    model: CLAUDE_MODEL,
    max_tokens: CLAUDE_MAX_TOKENS,
    thinking: { type: "between_tools" },
    system: HANDOVER_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: { type: "content", content: handoverContent(records) },
            title: `${fieldId} の ${season} 年の記録`,
            citations: { enabled: true },
          },
          { type: "text", text: HANDOVER_USER_TEXT },
        ],
      },
    ],
  };
}

/** 返事の状態コードと本文（JSON から読んだまま）を判定する。例外は出さない */
export function readHandoverReply(status: number, body: unknown, recordCount: number): HandoverReply {
  if (status !== 200) return { ok: false, reason: "http" };
  if (!isObject(body)) return { ok: false, reason: "shape" };
  if (body.stop_reason === "refusal") return { ok: false, reason: "refusal" };
  if (body.stop_reason === "max_tokens") return { ok: false, reason: "truncated" };
  if (body.stop_reason !== "end_turn") return { ok: false, reason: "shape" };
  try {
    return { ok: true, blocks: toHandoverBlocks(body.content, recordCount) };
  } catch {
    return { ok: false, reason: "shape" };
  }
}
