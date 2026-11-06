/**
 * 見比べるの「同じ日に撮った別の畑と」で、相手の写真が無いときの一文（11-06 地図の精査 #5）。
 * 地図の板の「目安の畑と見比べる」から来たときに、目安の畑の番号を出して、何が無いのかを言う
 */
export function sameDayEmptyNote(input: { dateLabel: string | null; selfId: string; benchmarkId: string | null; benchmarkHasPhotos: boolean }): string {
  const day = input.dateLabel ?? "この日";
  const { benchmarkId } = input;
  if (benchmarkId === null || benchmarkId === input.selfId) return `${day} に撮った別の畑の写真はありません`;
  if (!input.benchmarkHasPhotos) return `目安の畑 ${benchmarkId} には、まだ確定した写真がありません`;
  return `${day} に撮った目安の畑 ${benchmarkId} の写真はありません（同じ日に撮った写真どうしで比べます）`;
}
