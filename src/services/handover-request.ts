/**
 * L6 の Claude への要求と返事の判定（docs/spec.md §6・K17、T30 #107）。純粋関数。
 * 要求: T27 の要素を、引用を有効にしたカスタムコンテンツの 1 文書として渡す（Messages API、SDK は使わない）。
 * 返事: 200 で最後まで書き終えたものだけを T28 で blocks に写す。それ以外は失敗（T31 で 502、保存しない）。
 */
import type { HandoverRecord } from "@/types";
import type { HandoverBlock } from "./handover-citations";

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

/**
 * その圃場・シーズンの要素から要求の本文を作る。records が空なら例外（呼ぶ側は 422 で Claude を呼ばない）
 */
export function buildHandoverRequest(
  _fieldId: string,
  _season: string,
  _records: readonly HandoverRecord[],
): HandoverRequestBody {
  throw new Error("未実装");
}

/** 返事の状態コードと本文（JSON から読んだまま）を判定する。例外は出さない */
export function readHandoverReply(_status: number, _body: unknown, _recordCount: number): HandoverReply {
  throw new Error("未実装");
}
