/**
 * 引き継ぎメモ（L6）を読んだ・作った結果の言葉。Presenter（use-handover）が使う。
 * 読めたときと作れたときの言葉以外は、何をすればよいかが分かる言葉にする。
 */
import type { CreateHandoverOutcome, HandoverOutcome } from "@/repositories/interfaces/i-handover-repository";

const READ_LABELS: Record<HandoverOutcome["kind"], string | null> = {
  ok: null,
  none: "まだ引き継ぎメモはありません",
  "network-error": "引き継ぎメモを読めませんでした。電波のよい所で「更新」を押してください",
  error: "引き継ぎメモを読めませんでした。時間をおいて「更新」を押してください",
};

const CREATE_LABELS: Record<CreateHandoverOutcome["kind"], string> = {
  created: "引き継ぎメモを作りました",
  unauthorized: "メモを作るには合言葉が要ります",
  forbidden: "メモを作れるのは管理者だけです",
  "not-found": "この圃場は一覧にありません",
  "no-records": "判断や写真の記録がまだ無いので、メモを作れません",
  "usage-limit": "今日はもうメモを作れません（1日の回数の上限）。明日もう一度",
  "upstream-error": "Claude の返事を受け取れませんでした。時間をおいてもう一度",
  disabled: "いまは Claude を止めているので、メモを作れません。管理者に確かめてください",
  "network-error": "つながりませんでした。電波のよい所でもう一度",
  error: "メモを作れませんでした。時間をおいてもう一度",
};

/** 読んだ結果の言葉。読めたら言葉なし（null） */
export function handoverOutcomeLabel(outcome: HandoverOutcome): string | null {
  return READ_LABELS[outcome.kind];
}

/** 作った結果の言葉 */
export function createHandoverOutcomeLabel(outcome: CreateHandoverOutcome): string {
  return CREATE_LABELS[outcome.kind];
}
