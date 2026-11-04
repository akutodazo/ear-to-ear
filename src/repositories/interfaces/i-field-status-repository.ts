/**
 * 圃場の判断と地図のまとめの保存先の約束（docs/spec.md §6 の L1 の API）。画面はこの約束だけを知る。
 * 実体は fetch で API を呼ぶもの（implementations/http-field-status-repository.ts）。テストでは偽物を差し込む。
 * 合言葉で入るのは写真の保存先（IPhotoRepository.login）と同じ Cookie を使う。
 */
import type { FieldSummary, StatusEvent } from "@/types";
import type { StatusInput } from "@/services/status-reason";

/** GET /api/fields/summary の結果 */
export type SummaryOutcome = { kind: "ok"; fields: FieldSummary[] } | { kind: "network-error" } | { kind: "error" };

/** GET /api/fields/:id/status-events の結果（T26、#99。一覧に無い番号の 400／404 はどちらも error） */
export type HistoryOutcome = { kind: "ok"; events: StatusEvent[] } | { kind: "network-error" } | { kind: "error" };

/** POST /api/fields/:id/status の結果。rejected の reason は 422 の本文の理由のコード（読めなければ null） */
export type PostStatusOutcome =
  | { kind: "created"; event: StatusEvent }
  | { kind: "unauthorized" }
  | { kind: "rejected"; reason: string | null }
  | { kind: "network-error" }
  | { kind: "error" };

/** DELETE /api/status-events/:id の結果。not-found は無い判断と取り消し済みの両方 */
export type RevokeOutcome =
  | { kind: "ok"; event: StatusEvent }
  | { kind: "unauthorized" }
  | { kind: "not-found" }
  | { kind: "network-error" }
  | { kind: "error" };

export interface IFieldStatusRepository {
  /** 地図用の各圃場のまとめ（圃場の一覧の順） */
  listSummary(): Promise<SummaryOutcome>;
  /** その圃場の判断の履歴（取り消したものも含む。並びはサーバーの順のまま） */
  listHistory(fieldId: string): Promise<HistoryOutcome>;
  /** 判断を残す（委員以上） */
  postStatus(fieldId: string, input: StatusInput): Promise<PostStatusOutcome>;
  /** 判断を取り消す（委員以上。行は消えず、取り消した時刻が入る） */
  revoke(eventId: number): Promise<RevokeOutcome>;
}
