/**
 * 引き継ぎメモ（L6）を読んだ・作った結果の言葉。Presenter（use-handover）が使う。
 * 読めたときと作れたときの言葉以外は、何をすればよいかが分かる言葉にする。
 */
import type { CreateHandoverOutcome, HandoverOutcome } from "@/repositories/interfaces/i-handover-repository";

/** 読んだ結果の言葉。読めたら言葉なし（null） */
export function handoverOutcomeLabel(_outcome: HandoverOutcome): string | null {
  return null;
}

/** 作った結果の言葉 */
export function createHandoverOutcomeLabel(_outcome: CreateHandoverOutcome): string {
  return "";
}
