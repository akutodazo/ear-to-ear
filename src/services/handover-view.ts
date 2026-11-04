/**
 * L6 の引き継ぎメモを画面に出す形にする（docs/spec.md §7 の /fields/[id]、合格条件 13）。純粋関数。
 * 返事の text ブロック 1 つ＝画面の 1 文。各文に根拠の印（元の判断・写真へのリンク）を付け、根拠の無い文は「根拠なし」。
 * 記録の文の書き方は T27（handover-document）に合わせて読む。読めない文は種類の名前だけの印にする（隠さない）。
 * メモはネットワーク越しに届くので、範囲の外や数でない番号は黙って飛ばす（画面を壊さない）。
 */
import type { HandoverNote, HandoverRecord } from "@/types";

/** 根拠の無い文に添える言葉 */
export const NO_SOURCE_LABEL = "根拠なし";

/** 根拠の印 1 つ */
export interface HandoverSource {
  kind: HandoverRecord["kind"];
  /** 元の記録の id（判断は番号の文字列、写真は UUID） */
  id: string;
  /** 印の言葉。例「判断 7/21」「判断 7/21（取り消し）」「写真 7/20」「写真（撮影日不明）」 */
  label: string;
  /** 戻り先。判断は履歴の項目のアンカー、写真は画像 */
  href: string;
  /** その記録から引用された部分（最初に引用されたもの） */
  citedText: string;
}

/** 画面の 1 文 */
export interface HandoverSentence {
  text: string;
  /** 重複なし、最初に引用された順 */
  sources: HandoverSource[];
  /** 根拠が 1 つも無い（灰色で「根拠なし」） */
  uncited: boolean;
}

/** 判断の履歴の項目に付ける id（画面の履歴とメモの印で同じものを使う） */
export function statusAnchorId(_eventId: string): string {
  return "";
}

/** 記録 1 件の印の言葉 */
export function sourceLabel(_record: HandoverRecord): string {
  return "";
}

/** メモを画面の文の並びにする。中身が空白だけのブロックは出さない */
export function handoverSentences(_note: HandoverNote): HandoverSentence[] {
  return [];
}
