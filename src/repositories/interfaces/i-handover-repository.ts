/**
 * 引き継ぎメモの保存先の約束（docs/spec.md §6 の L6 の API、T29 #106・T31）。画面はこの約束だけを知る。
 * 実体は fetch で API を呼ぶもの（implementations/http-handover-repository.ts）。テストでは偽物を差し込む。
 * 合言葉で入るのは写真の保存先（IPhotoRepository.login）と同じ Cookie を使う。
 */
import type { HandoverNote } from "@/types";

/** GET /api/fields/:id/handover の結果。none は今のシーズンのメモが無い（404） */
export type HandoverOutcome =
  | { kind: "ok"; note: HandoverNote }
  | { kind: "none" }
  | { kind: "network-error" }
  | { kind: "error" };

/**
 * POST /api/fields/:id/handover の結果（#107 の先輩の決定）。
 * forbidden は管理者でない（403）、no-records は記録が 0 件（422）、usage-limit は 1 日の上限（429）、
 * upstream-error は Claude の失敗・形の違う返事（502。保存されない）
 */
export type CreateHandoverOutcome =
  | { kind: "created"; note: HandoverNote }
  | { kind: "unauthorized" }
  | { kind: "forbidden" }
  | { kind: "not-found" }
  | { kind: "no-records" }
  | { kind: "usage-limit" }
  | { kind: "upstream-error" }
  | { kind: "network-error" }
  | { kind: "error" };

export interface IHandoverRepository {
  /** 今のシーズンの引き継ぎメモ（認証なし） */
  getNote(fieldId: string): Promise<HandoverOutcome>;
  /** メモを作り直して保存する（管理者。Claude を 1 回呼ぶ） */
  createNote(fieldId: string): Promise<CreateHandoverOutcome>;
}
