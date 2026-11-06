/**
 * 判断を記録した直後の、引き継ぎメモを作る誘い（11-06 本人の指示: メモを作る所が分かりにくい）。純粋関数。
 * 見比べるの「記録しました」の下に出し、押すと下の「今年の引き継ぎメモ」の段で作る。作れるのは管理者だけ（守るのはサーバー）
 */

/** 出す言葉。記録していない・一度押した後は出さない（null） */
export function memoOfferLabel({ recorded, asked, hasMemo }: { recorded: boolean; asked: boolean; hasMemo: boolean }): string | null {
  if (!recorded || asked) return null;
  return hasMemo ? "この判断で引き継ぎメモを作り直す（管理者）" : "この判断で引き継ぎメモを作る（管理者）";
}
