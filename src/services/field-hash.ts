/**
 * 画面をまたいで畑を引き継ぐ URL の #（精査 5 回目）。純粋関数。
 * - `/upload#A-01`: 送る画面で、番号を A-01 にしておく（#5）。委員が選んだ番号として送るだけで、確定は管理者のまま
 * - `/recent#unconfirmed`: 新着を「未確定だけ見る」で開く（#1）
 */

/** `#A-01` の形で、一覧にある番号だけを返す。ほかは null */
export function fieldIdFromHash(hash: string, ids: readonly string[]): string | null {
  if (!hash.startsWith("#")) return null;
  const id = hash.slice(1);
  return ids.includes(id) ? id : null;
}

/** 新着を「未確定だけ見る」で開く # か */
export function unconfirmedHash(hash: string): boolean {
  return hash === "#unconfirmed";
}
