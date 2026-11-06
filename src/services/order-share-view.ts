/**
 * LINE に 1 枚の共有（#162）の、端末の共有に渡すものと言葉。純粋関数。
 * URL を共有すると、LINE がページの og:image を読んでトークに地図のサムネイルを出す（#160）
 */
import type { CreateOrderShareOutcome } from "@/repositories/interfaces/i-order-share-repository";

/** navigator.share に渡すもの。text に URL を入れない（Android の LINE は text と url をつなぐので二重になる） */
export function shareData(text: string, url: string): { text: string; url: string } {
  return { text, url };
}

/** 端末の共有が無いときの代わり。文の後に URL（トークに URL が貼られればサムネイルが出る） */
export function lineShareHref(text: string, url: string): string {
  return `https://line.me/R/share?text=${encodeURIComponent(`${text}\n${url}`)}`;
}

const LABELS: Record<Exclude<CreateOrderShareOutcome["kind"], "created">, string> = {
  unauthorized: "共有の URL を作るには合言葉が要ります",
  "usage-limit": "今日はこれ以上作れません（日本時間の 0 時に戻ります）",
  "too-large": "絵が大きすぎて送れませんでした",
  rejected: "絵を送れませんでした（形が違います）",
  "network-error": "つながりませんでした。電波のよい所でもう一度",
  error: "うまくいきませんでした。時間をおいてもう一度",
};

/** 送る準備の結果の言葉。作れたときは null */
export function createShareOutcomeLabel(outcome: CreateOrderShareOutcome): string | null {
  return outcome.kind === "created" ? null : LABELS[outcome.kind];
}
