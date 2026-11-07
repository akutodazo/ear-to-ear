/**
 * 刈る順番の画面（#196）の言葉と、下の固定の帯の主ボタン。純粋関数。
 * 帯の主ボタンは 1 つだけ（西田 PM 11-07「ごちゃっとしてる」）。まれな操作は … のシートへ
 */
import { monthDayJst } from "./parcel-geometry";

export type OrderBarAction = "none" | "save" | "saved" | "confirm" | "reconfirm" | "confirm-disabled" | "share";

export interface OrderBarInput {
  loading: boolean;
  hasRanked: boolean;
  /** 保存した順（無ければ記録からの下書き）と違うか */
  dirty: boolean;
  savedState: "draft" | "confirmed" | null;
  differsFromConfirmed: boolean;
  isAdmin: boolean;
}

export function orderBarAction({ loading, hasRanked, dirty, savedState, differsFromConfirmed, isAdmin }: OrderBarInput): OrderBarAction {
  if (loading) return "none";
  if (savedState === "confirmed" && !differsFromConfirmed && !dirty) return "share";
  if (isAdmin) {
    if (!hasRanked) return "confirm-disabled";
    return savedState === "confirmed" ? "reconfirm" : "confirm";
  }
  return dirty || savedState === null ? "save" : "saved";
}

export interface OrderHeadlineInput {
  savedState: "draft" | "confirmed" | null;
  savedAt: string | null;
  differsFromConfirmed: boolean;
  dirty: boolean;
}

/** 状態の行 */
export function orderHeadline({ savedState, savedAt, differsFromConfirmed, dirty }: OrderHeadlineInput): string {
  if (savedState === "confirmed" && differsFromConfirmed) return "確定した順と違います";
  if (savedState !== null && dirty) return "並べ途中（保存していません）";
  if (savedState === "confirmed" && savedAt) return `${monthDayJst(savedAt)} に確定した順`;
  if (savedState === "draft" && savedAt) return `${monthDayJst(savedAt)} に保存した下書き`;
  return "記録から並べた下書き";
}

export interface MoveOption {
  label: string;
  to: number;
  disabled: boolean;
}

/** 持ち手を押すだけで開く動かし方（ドラッグの代わり、WCAG 2.5.7） */
export function moveOptions(index: number, count: number): MoveOption[] {
  const last = count - 1;
  return [
    { label: "先頭へ", to: 0, disabled: index === 0 },
    { label: "1 つ上へ", to: Math.max(0, index - 1), disabled: index === 0 },
    { label: "1 つ下へ", to: Math.min(last, index + 1), disabled: index === last },
    { label: "最後へ", to: last, disabled: index === last },
  ];
}

/** 帯の LINE のボタンの言葉（絵の段 × 共有の URL の段） */
export function shareButtonLabel(image: "drawing" | "ready" | "error", link: "none" | "uploading" | "ready"): string {
  if (image === "error") return "地図の絵を作れませんでした";
  if (image === "drawing") return "地図の絵を作っています…";
  if (link === "uploading") return "共有の URL を作っています…";
  if (link === "ready") return "LINE で送る";
  return "LINE で送る準備";
}
