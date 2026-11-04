/**
 * fetch で L1 の判断と地図の API（docs/spec.md §6）を呼ぶ保存先。fetch は引数で受け取る（AGENTS.md §4）。
 * HTTP の状態を「結果の種類」に読み分けるだけで、画面の文言は持たない（言葉は services/status-view）。
 */
import type { StatusInput } from "@/services/status-reason";
import type {
  HistoryOutcome,
  IFieldStatusRepository,
  PostStatusOutcome,
  RevokeOutcome,
  SummaryOutcome,
} from "@/repositories/interfaces/i-field-status-repository";
import type { FetchLike } from "./http-photo-repository";

export function createHttpFieldStatusRepository(fetchFn: FetchLike, baseUrl = ""): IFieldStatusRepository {
  void fetchFn;
  void baseUrl;
  return {
    async listSummary(): Promise<SummaryOutcome> {
      throw new Error("not implemented");
    },
    async listHistory(fieldId: string): Promise<HistoryOutcome> {
      void fieldId;
      throw new Error("not implemented");
    },
    async postStatus(fieldId: string, input: StatusInput): Promise<PostStatusOutcome> {
      void fieldId;
      void input;
      throw new Error("not implemented");
    },
    async revoke(eventId: number): Promise<RevokeOutcome> {
      void eventId;
      throw new Error("not implemented");
    },
  };
}
