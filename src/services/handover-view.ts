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

/** T27 の判断の文の先頭（「[判断 番号] YYYY-MM-DD 」） */
const STATUS_HEAD = /^\[判断 \d+\] \d{4}-(\d{2})-(\d{2}) /;
/** T27 の判断の文末の取り消し（「（YYYY-MM-DD に取り消し）」） */
const STATUS_REVOKED_TAIL = /（\d{4}-\d{2}-\d{2} に取り消し）$/;
/** T27 の写真の文の先頭（「[写真] YYYY-MM-DD 撮影」） */
const PHOTO_HEAD = /^\[写真\] \d{4}-(\d{2})-(\d{2}) 撮影/;
/** T27 の撮影日不明の写真の文の先頭 */
const PHOTO_UNKNOWN_HEAD = /^\[写真\] 撮影日不明（/;

/** 'MM'・'DD' を 0 を付けない「月/日」にする */
function monthDay(month: string, day: string): string {
  return `${Number(month)}/${Number(day)}`;
}

/** 判断の履歴の項目に付ける id（画面の履歴とメモの印で同じものを使う） */
export function statusAnchorId(eventId: string): string {
  return `status-event-${eventId}`;
}

/** 記録 1 件の印の言葉 */
export function sourceLabel(record: HandoverRecord): string {
  if (record.kind === "status") {
    const m = STATUS_HEAD.exec(record.text);
    if (m === null) return "判断";
    const base = `判断 ${monthDay(m[1], m[2])}`;
    return STATUS_REVOKED_TAIL.test(record.text) ? `${base}（取り消し）` : base;
  }
  const m = PHOTO_HEAD.exec(record.text);
  if (m !== null) return `写真 ${monthDay(m[1], m[2])}`;
  if (PHOTO_UNKNOWN_HEAD.test(record.text)) return "写真（撮影日不明）";
  return "写真";
}

function sourceHref(record: HandoverRecord): string {
  return record.kind === "status"
    ? `#${statusAnchorId(record.id)}`
    : `/api/photo-files/${encodeURIComponent(record.id)}`;
}

/** メモを画面の文の並びにする。中身が空白だけのブロックは出さない */
export function handoverSentences(note: HandoverNote): HandoverSentence[] {
  const records = note.records;
  const sentences: HandoverSentence[] = [];
  for (const block of note.blocks) {
    if (block.text.trim() === "") continue;
    const seen = new Set<number>();
    const sources: HandoverSource[] = [];
    for (const c of block.cites) {
      const start: unknown = c.start;
      const end: unknown = c.end;
      if (typeof start !== "number" || typeof end !== "number") continue;
      if (!Number.isInteger(start) || !Number.isInteger(end) || start >= end) continue;
      const lo = Math.max(0, start);
      const hi = Math.min(end, records.length);
      const citedText: unknown = c.citedText;
      for (let i = lo; i < hi; i++) {
        if (seen.has(i)) continue;
        seen.add(i);
        const record = records[i];
        sources.push({
          kind: record.kind,
          id: record.id,
          label: sourceLabel(record),
          href: sourceHref(record),
          citedText: typeof citedText === "string" ? citedText : "",
        });
      }
    }
    sentences.push({ text: block.text, sources, uncited: sources.length === 0 });
  }
  return sentences;
}
