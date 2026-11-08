/**
 * 地図の画面の整理（#200。西田 PM 11-07「ごちゃっとしてる」）。純粋関数。
 * 凡例は最初の 1 回だけ開いておき、あとは「凡例」ボタンで開く。写真を送るは地図の丸いボタン
 */
import type { UploadedPhoto } from "@/types";

/** 地図で選んだ畑の最新の写真の読み込みの段階 */
export type LatestPhotoState =
  /** 何も選んでいない */
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error" }
  /** photo が null なら、まだ確定した写真が無い */
  | { kind: "ok"; photo: UploadedPhoto | null; count: number };

/** 凡例を開いておくか。見たことが無い端末だけ開く */
export function legendOpenAtStart(seen: boolean): boolean {
  return !seen;
}

/** 地図の丸いボタン「送る」の行き先。選んでいる畑があればその番号を送る画面に引き継ぐ */
export function uploadHref(selectedId: string | null): string {
  return selectedId === null ? "/upload" : `/upload#${encodeURIComponent(selectedId)}`;
}
