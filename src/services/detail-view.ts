/**
 * 畑の詳細画面（#195）の言葉と切り替え。純粋関数。
 * 人の判断（判断の行）と記録からの順位（順番の段）は別の段にし、同じ行に混ぜない
 */
import type { Role, StatusEvent } from "@/types";
import { monthDayJst } from "./parcel-geometry";
import { statusLabel } from "./status-view";

/** 判断の行。最新の取り消していない判断から */
export function judgmentLine(latest: Pick<StatusEvent, "status" | "at"> | null): string {
  if (latest === null) return "判断はまだありません";
  return `${monthDayJst(latest.at)} に${statusLabel(latest.status)}と判断`;
}

/** 主役の写真の右下。今年でない写真は年を付ける（昨年の写真を今年の様子に見せない） */
export function heroMeta(takenAt: string | null, count: number, season: string): string {
  if (takenAt === null) return `撮影日不明・${count} 枚`;
  const [year, month, day] = takenAt.split("-");
  const md = `${Number(month)}/${Number(day)}`;
  return year === season ? `${md} 撮影・${count} 枚` : `${year}年 ${md} 撮影・${count} 枚`;
}

export interface RankLineInput {
  /** 1 から。順位なしは null */
  rank: number | null;
  /** 下書き・確定した順のまま・確定した順と違う */
  state: "draft" | "confirmed" | "differs";
  confirmedAt: string | null;
}

export interface RankLineView {
  title: string;
  sub: string | null;
  ring: "draft" | "confirmed" | "none";
  action: "外す" | "順位を付ける";
}

export function rankLineView({ rank, state, confirmedAt }: RankLineInput): RankLineView {
  if (rank === null) return { title: "刈る順番 順位なし", sub: null, ring: "none", action: "順位を付ける" };
  const title = `刈る順番 ${rank} 番目`;
  if (state === "confirmed" && confirmedAt !== null) return { title, sub: `${monthDayJst(confirmedAt)} に確定`, ring: "confirmed", action: "外す" };
  if (state === "differs") return { title, sub: "並べ途中（確定した順と違います）", ring: "draft", action: "外す" };
  return { title, sub: "下書き（この端末）", ring: "draft", action: "外す" };
}

export type FieldView = "detail" | "compare";

/** location.hash から。#compare だけ比較 */
export function readFieldView(hash: string): FieldView {
  return hash === "#compare" ? "compare" : "detail";
}

/** 引き継ぎメモ（今年・昨年）を出すか。委員長だけ（西田 PM 11-07）。守るのはサーバー */
export function showHandoverTo(role: Role | null | undefined): boolean {
  return role === "admin";
}

/** 取り消していない最新の判断。同じ時刻なら id の大きいほう（後から記録したもの）。無ければ null */
export function latestLiveEvent(history: readonly StatusEvent[]): StatusEvent | null {
  const live = history.filter((e) => e.revokedAt === null);
  if (live.length === 0) return null;
  return live.reduce((a, b) => (a.at > b.at || (a.at === b.at && a.id > b.id) ? a : b));
}

/** 順番の段の状態。確定した順と違う → differs、確定してそのまま → confirmed、ほかは下書き */
export function rankLineState(input: {
  differsFromConfirmed: boolean;
  savedState: "draft" | "confirmed" | null;
  /** 保存した順から並べ直している途中 */
  dirty: boolean;
}): RankLineInput["state"] {
  if (input.differsFromConfirmed) return "differs";
  return input.savedState === "confirmed" && !input.dirty ? "confirmed" : "draft";
}

/** 刈る順番の何番目か（1 から）。並びに入っていなければ null */
export function rankOf(ranked: readonly string[], fieldId: string): number | null {
  const index = ranked.indexOf(fieldId);
  return index < 0 ? null : index + 1;
}

/** 判断の行の下の 1 行。記録した直後はその結果、そうでなければ取り消しの文（赤字の扱い）。無ければ null */
export function decideResult(input: {
  recorded: boolean;
  formMessage: { text: string; ok: boolean } | null;
  revokeMessage: string | null;
}): { text: string; ok: boolean } | null {
  if (input.recorded && input.formMessage) return input.formMessage;
  return input.revokeMessage ? { text: input.revokeMessage, ok: false } : null;
}
