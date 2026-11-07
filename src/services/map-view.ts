/**
 * 地図の画面の整理（#200。西田 PM 11-07「ごちゃっとしてる」）。純粋関数。
 * 凡例は最初の 1 回だけ開いておき、あとは「凡例」ボタンで開く。写真を送るは地図の丸いボタン
 */

/** 凡例を開いておくか。見たことが無い端末だけ開く */
export function legendOpenAtStart(seen: boolean): boolean {
  return !seen;
}

/** 地図の丸いボタン「送る」の行き先。選んでいる畑があればその番号を送る画面に引き継ぐ */
export function uploadHref(selectedId: string | null): string {
  return selectedId === null ? "/upload" : `/upload#${encodeURIComponent(selectedId)}`;
}
