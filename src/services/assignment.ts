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
  void photo;
  void fields;
  throw new Error("not implemented");
}

/** 最初に選んでおく番号。確定済みはその番号、未確定は一番近い候補、どちらも無ければ ""（選ばせる） */
export function initialAssignment(photo: AssignablePhoto, fields: Field[]): string {
  void photo;
  void fields;
  throw new Error("not implemented");
}

/** ボタンの文言。未確定は「確定」、確定済みは「変更」 */
export function assignButtonLabel(photo: Pick<UploadedPhoto, "state">): string {
  void photo;
  throw new Error("not implemented");
}

/** 押せるか。一覧にある番号で、確定済みの番号と同じでないこと */
export function canAssign(photo: AssignablePhoto, fieldId: string, fields: Field[]): boolean {
  void photo;
  void fieldId;
  void fields;
  throw new Error("not implemented");
}

/** 確定・変更が通った後の一覧。その写真だけを確定にして番号を替える（元の配列は変えない） */
export function applyAssignment(photos: UploadedPhoto[], photoId: string, fieldId: string): UploadedPhoto[] {
  void photos;
  void photoId;
  void fieldId;
  throw new Error("not implemented");
}

/** 確定・変更の結果の表示 */
export function assignOutcomeLabel(outcome: AssignOutcome, fieldId: string): string {
  void outcome;
  void fieldId;
  throw new Error("not implemented");
}
