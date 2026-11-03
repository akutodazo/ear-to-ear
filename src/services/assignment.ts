/**
 * 管理者の「確定・変更」（docs/spec.md §6 の PATCH /api/photos/:id/assignment、§7 の /recent）。純粋関数。
 * 選ぶ番号は候補（近い順）を先に、残りを地区ごとに並べる。委員が選んだ番号は出さない（11-03 本人決定）。
 */
import type { Field, UploadedPhoto } from "@/types";
import type { AssignOutcome } from "@/repositories/interfaces/i-photo-repository";

export interface AssignmentOptionGroup {
  /** 「推定」か地区名 */
  label: string;
  options: { fieldId: string; label: string }[];
}

type AssignablePhoto = Pick<UploadedPhoto, "state" | "fieldId" | "candidateFieldIds">;

/** 番号の選択肢。候補を「推定」として先に、残りを地区ごと（圃場一覧の順）に。同じ番号は2回出さない */
export function assignmentOptionGroups(photo: AssignablePhoto, fields: Field[]): AssignmentOptionGroup[] {
  const option = (f: Field) => ({ fieldId: f.id, label: `${f.id} ${f.name}` });
  const candidates = knownCandidates(photo, fields);
  const groups: AssignmentOptionGroup[] = [];
  if (candidates.length > 0) groups.push({ label: "推定", options: candidates.map(option) });
  for (const field of fields) {
    if (candidates.includes(field)) continue;
    let group = groups.find((g) => g.label === field.district);
    if (!group) {
      group = { label: field.district, options: [] };
      groups.push(group);
    }
    group.options.push(option(field));
  }
  return groups;
}

/** 圃場一覧にある候補だけ（近い順のまま） */
function knownCandidates(photo: AssignablePhoto, fields: Field[]): Field[] {
  return photo.candidateFieldIds.flatMap((id) => fields.filter((f) => f.id === id));
}

/** 最初に選んでおく番号。確定済みはその番号、未確定は一番近い候補、どちらも無ければ ""（選ばせる） */
export function initialAssignment(photo: AssignablePhoto, fields: Field[]): string {
  if (photo.state === "confirmed" && photo.fieldId !== null) return photo.fieldId;
  return knownCandidates(photo, fields)[0]?.id ?? "";
}

/** ボタンの文言。未確定は「確定」、確定済みは「変更」 */
export function assignButtonLabel(photo: Pick<UploadedPhoto, "state">): string {
  return photo.state === "confirmed" ? "変更" : "確定";
}

/** 押せるか。一覧にある番号で、確定済みの番号と同じでないこと */
export function canAssign(photo: AssignablePhoto, fieldId: string, fields: Field[]): boolean {
  if (!fields.some((f) => f.id === fieldId)) return false;
  return !(photo.state === "confirmed" && photo.fieldId === fieldId);
}

/** 確定・変更が通った後の一覧。その写真だけを確定にして番号を替える（元の配列は変えない） */
export function applyAssignment(photos: UploadedPhoto[], photoId: string, fieldId: string): UploadedPhoto[] {
  return photos.map((p) => (p.id === photoId ? { ...p, state: "confirmed", fieldId } : p));
}

const OUTCOME_LABELS: Record<Exclude<AssignOutcome, "ok">, string> = {
  unauthorized: "管理者の合言葉を入れてください",
  forbidden: "管理者の合言葉で入り直してください",
  "not-found": "この写真は見つかりませんでした。「更新」を押してください",
  rejected: "この番号には決められませんでした",
  "network-error": "つながりませんでした。電波のよい所でもう一度",
  error: "うまくいきませんでした。時間をおいてもう一度",
};

/** 確定・変更の結果の表示 */
export function assignOutcomeLabel(outcome: AssignOutcome, fieldId: string): string {
  return outcome === "ok" ? `${fieldId} に決めました` : OUTCOME_LABELS[outcome];
}
