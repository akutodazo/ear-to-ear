/**
 * 見比べるの「同じ日に撮った別の畑と」で、相手の写真が無いときの一文（11-06 地図の精査 #5）。
 * 地図の板の「目安の畑と見比べる」から来たときに、目安の畑の番号を出して、何が無いのかを言う
 */
import { monthDay } from "./last-season";
import type { CompareMode } from "./photo-compare";

export function sameDayEmptyNote(input: { dateLabel: string | null; selfId: string; benchmarkId: string | null; benchmarkHasPhotos: boolean }): string {
  const day = input.dateLabel ?? "この日";
  const { benchmarkId } = input;
  if (benchmarkId === null || benchmarkId === input.selfId) return `${day} に撮った別の畑の写真はありません`;
  if (!input.benchmarkHasPhotos) return `目安の畑 ${benchmarkId} には、まだ確定した写真がありません`;
  return `${day} に撮った目安の畑 ${benchmarkId} の写真はありません（同じ日に撮った写真どうしで比べます）`;
}

/**
 * 比較の段に写真を並べられないときの一文。並べられるなら null。
 * 上から順に、読み込み中 → この畑の写真を読めなかった → この畑に写真が無い → 相手が無い（比べ方ごと）
 */
export function compareStageNote(input: {
  loading: boolean;
  ownFailed: boolean;
  ownDayCount: number;
  /** 上の写真（同じ日の相手か前の日）がある */
  hasPartner: boolean;
  mode: CompareMode;
  date: string | null;
  selfId: string;
  benchmarkId: string | null;
  benchmarkHasPhotos: boolean;
}): string | null {
  if (input.loading) return "写真を読み込んでいます";
  if (input.ownFailed) return "写真を読み込めませんでした";
  if (input.ownDayCount === 0) return "この畑の写真はまだありません";
  if (input.hasPartner) return null;
  if (input.mode === "same-field") return "前の日の写真はありません";
  return sameDayEmptyNote({
    dateLabel: input.date ? monthDay(input.date) : null,
    selfId: input.selfId,
    benchmarkId: input.benchmarkId,
    benchmarkHasPhotos: input.benchmarkHasPhotos,
  });
}
