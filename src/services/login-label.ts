/**
 * 合言葉で入った結果の言葉（新着・送る・判断・引き継ぎメモの画面で同じ）。ok は言葉なし（null）。
 */
import type { LoginOutcome } from "@/repositories/interfaces/i-photo-repository";

const LOGIN_LABELS: Record<LoginOutcome, string | null> = {
  ok: null,
  wrong: "合言葉が違います",
  "too-many": "何度も間違えたので、10分ほどおいてからもう一度",
  "network-error": "つながりませんでした。電波のよい所でもう一度",
  error: "うまくいきませんでした。時間をおいてもう一度",
};

export function loginOutcomeLabel(outcome: LoginOutcome): string | null {
  return LOGIN_LABELS[outcome];
}
