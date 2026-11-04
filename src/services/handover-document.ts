/**
 * L6 の 1 段目（docs/spec.md §3・K17、T27 #104）。圃場の判断と写真の記録を、
 * Claude API の引用（Citations）に渡すカスタムコンテンツの要素に並べる。1 記録＝1 要素、番号＝添字。
 * 端末 ID・写真の id・大きさは文に入れない（Claude に送る必要がない）。
 */
import type { HandoverRecord, StatusEvent, UploadedPhoto } from "@/types";

/** 引用用のカスタムコンテンツの 1 要素 */
export interface HandoverContentBlock {
  type: "text";
  text: string;
}

/**
 * その圃場・そのシーズン（日本時間の年 'YYYY'）の判断と確定済みの写真を、古い順の要素に並べる。
 * 他の圃場の記録・確定していない写真・一覧に無い理由のコードが渡されたら例外
 */
export function buildHandoverRecords(
  _fieldId: string,
  _season: string,
  _events: readonly StatusEvent[],
  _photos: readonly UploadedPhoto[],
): HandoverRecord[] {
  throw new Error("未実装");
}

/** records を同じ順・同じ数の text の要素にする（番号＝records の添字） */
export function handoverContent(_records: readonly HandoverRecord[]): HandoverContentBlock[] {
  throw new Error("未実装");
}
