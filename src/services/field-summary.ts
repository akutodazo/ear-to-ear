/**
 * 地図用の各圃場のまとめ（GET /api/fields/summary、L1、docs/spec.md §6、Issue #90）。
 * 有効な最新の判断と、未確定の写真の印。返す形は 11-04 本人承認。
 */
import type { FieldSummary, StatusEvent } from "@/types";

/** 未確定の写真の 1 行（D1 から読んだまま） */
export interface UnconfirmedPhotoRow {
  /** JSON の文字列の配列（近い順、最大3） */
  candidate_field_ids: string;
  chosen_field_id: string | null;
}

/** 候補の列を文字列の配列に戻す。違えば列の名前の例外（中身はメッセージに入れない） */
function parseCandidates(text: string): string[] {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("candidate_field_ids が JSON ではない");
  }
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new Error("candidate_field_ids が文字列の配列ではない");
  }
  return value;
}

/** a が b より新しいか（at が新しい、同じなら id が大きい） */
function isNewer(a: StatusEvent, b: StatusEvent): boolean {
  if (a.at !== b.at) return a.at > b.at;
  return a.id > b.id;
}

/**
 * fieldIds の順に 1 圃場ずつまとめる。fieldIds に無い圃場の判断・写真は見ない。
 * latest は revokedAt が null の判断のうち at が新しいもの（同じなら id の大きい方）。無ければ null。
 * hasUnconfirmed は、未確定の写真の候補か委員が選んだ番号にその圃場が含まれるか。
 * candidate_field_ids が文字列の配列の JSON でなければ例外（500）。例外のメッセージに列の中身を入れない
 */
export function summarizeFields(
  fieldIds: readonly string[],
  events: readonly StatusEvent[],
  unconfirmed: readonly UnconfirmedPhotoRow[],
): FieldSummary[] {
  const marked = new Set<string>();
  for (const row of unconfirmed) {
    for (const id of parseCandidates(row.candidate_field_ids)) marked.add(id);
    if (row.chosen_field_id !== null) marked.add(row.chosen_field_id);
  }

  const latestByField = new Map<string, StatusEvent>();
  for (const e of events) {
    if (e.revokedAt !== null) continue;
    const current = latestByField.get(e.fieldId);
    if (current === undefined || isNewer(e, current)) latestByField.set(e.fieldId, e);
  }

  return fieldIds.map((fieldId) => ({
    fieldId,
    latest: latestByField.get(fieldId) ?? null,
    hasUnconfirmed: marked.has(fieldId),
  }));
}
