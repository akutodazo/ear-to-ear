/**
 * L6 の 1 段目（docs/spec.md §3・K17、T27 #104）。圃場の判断と写真の記録を、
 * Claude API の引用（Citations）に渡すカスタムコンテンツの要素に並べる。1 記録＝1 要素、番号＝添字。
 * 端末 ID・写真の id・大きさは文に入れない（Claude に送る必要がない）。
 */
import { STATUS_REASONS } from "@/config";
import type { HandoverRecord, StatusEvent, UploadedPhoto } from "@/types";

/** 引用用のカスタムコンテンツの 1 要素 */
export interface HandoverContentBlock {
  type: "text";
  text: string;
}

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

const STATUS_LABELS: Record<StatusEvent["status"], string> = {
  ready: "収穫可能",
  done: "収穫済",
};

/** ISO の時刻を日本時間の 'YYYY-MM-DD' にする */
function jstDate(iso: string): string {
  return new Date(Date.parse(iso) + JST_OFFSET_MS).toISOString().slice(0, 10);
}

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** 呼ぶたびに設定から引く（一覧に無いコードは例外） */
function reasonLabel(code: string): string {
  const found = STATUS_REASONS.find((r) => r.code === code);
  if (found === undefined) {
    throw new Error("一覧に無い理由のコードがある");
  }
  return found.label;
}

function statusText(event: StatusEvent): string {
  const parts = [`[判断 ${event.id}] ${jstDate(event.at)} ${STATUS_LABELS[event.status]}。`];
  parts.push(event.reasons.length === 0 ? "理由の記録なし。" : `理由: ${event.reasons.map(reasonLabel).join("・")}。`);
  if (event.note !== null) {
    parts.push(`メモ: ${event.note}。`);
  }
  if (event.refPhotoIds.length > 0) {
    parts.push(`根拠の写真: ${event.refPhotoIds.length} 枚。`);
  }
  if (event.revokedAt !== null) {
    parts.push(`（${jstDate(event.revokedAt)} に取り消し）`);
  }
  return parts.join("");
}

/** 根拠にした判断は、そのシーズンのもの（取り消し済みも含む）を番号の小さい順に書く */
function photoText(photo: UploadedPhoto, events: readonly StatusEvent[]): string {
  if (photo.takenAt === null) {
    return `[写真] 撮影日不明（${jstDate(photo.uploadedAt)} に送信）。`;
  }
  const refIds = events
    .filter((e) => e.refPhotoIds.includes(photo.id))
    .map((e) => e.id)
    .sort((a, b) => a - b);
  const refs = refIds.length === 0 ? "" : `判断 ${refIds.join("・")} の根拠。`;
  return `[写真] ${photo.takenAt} 撮影。${refs}`;
}

type Entry =
  | { kind: "photo"; date: string | null; photo: UploadedPhoto; record: HandoverRecord }
  | { kind: "status"; date: string; event: StatusEvent; record: HandoverRecord };

/** 日付の古い順（撮影日不明は最後）。同じ日は写真が先、写真は送った時刻・id、判断は at・id（数） */
function compareEntries(a: Entry, b: Entry): number {
  if (a.date === null || b.date === null) {
    if (a.date !== null) return -1;
    if (b.date !== null) return 1;
  } else {
    const byDate = compareText(a.date, b.date);
    if (byDate !== 0) return byDate;
  }
  if (a.kind === "photo" && b.kind === "photo") {
    return compareText(a.photo.uploadedAt, b.photo.uploadedAt) || compareText(a.photo.id, b.photo.id);
  }
  if (a.kind === "status" && b.kind === "status") {
    return compareText(a.event.at, b.event.at) || a.event.id - b.event.id;
  }
  return a.kind === "photo" ? -1 : 1;
}

/**
 * その圃場・そのシーズン（日本時間の年 'YYYY'）の判断と確定済みの写真を、古い順の要素に並べる。
 * 他の圃場の記録・確定していない写真・一覧に無い理由のコードが渡されたら例外
 */
export function buildHandoverRecords(
  fieldId: string,
  season: string,
  events: readonly StatusEvent[],
  photos: readonly UploadedPhoto[],
): HandoverRecord[] {
  // シーズンで絞る前に確かめる
  for (const e of events) {
    if (e.fieldId !== fieldId) {
      throw new Error("他の圃場の判断が混ざっている");
    }
  }
  for (const p of photos) {
    if (p.fieldId !== fieldId) {
      throw new Error("他の圃場の写真が混ざっている");
    }
    if (p.state !== "confirmed") {
      throw new Error("確定していない写真が混ざっている");
    }
  }

  const seasonEvents = events.filter((e) => jstDate(e.at).slice(0, 4) === season);
  const seasonPhotos = photos.filter(
    (p) => (p.takenAt ?? jstDate(p.uploadedAt)).slice(0, 4) === season,
  );

  const entries: Entry[] = [
    ...seasonPhotos.map(
      (p): Entry => ({
        kind: "photo",
        date: p.takenAt,
        photo: p,
        record: { kind: "photo", id: p.id, text: photoText(p, seasonEvents) },
      }),
    ),
    ...seasonEvents.map(
      (e): Entry => ({
        kind: "status",
        date: jstDate(e.at),
        event: e,
        record: { kind: "status", id: String(e.id), text: statusText(e) },
      }),
    ),
  ];

  return entries.sort(compareEntries).map((entry) => entry.record);
}

/** records を同じ順・同じ数の text の要素にする（番号＝records の添字） */
export function handoverContent(records: readonly HandoverRecord[]): HandoverContentBlock[] {
  return records.map((r) => ({ type: "text", text: r.text }));
}
