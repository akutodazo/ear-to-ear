/**
 * 合言葉で入った結果の言葉（新着・送る・判断・引き継ぎメモの画面で同じ）。ok は言葉なし（null）。
 */
import type { LoginOutcome } from "@/repositories/interfaces/i-photo-repository";

export function loginOutcomeLabel(_outcome: LoginOutcome): string | null {
  return null;
}
