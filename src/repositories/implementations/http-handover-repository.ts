/**
 * fetch で L6 の引き継ぎメモの API（docs/spec.md §6）を呼ぶ保存先。fetch は引数で受け取る（AGENTS.md §4）。
 * HTTP の状態を「結果の種類」に読み分けるだけで、画面の文言は持たない。
 */
import type {
  CreateHandoverOutcome,
  HandoverOutcome,
  IHandoverRepository,
} from "@/repositories/interfaces/i-handover-repository";
import type { FetchLike } from "./http-photo-repository";

export function createHttpHandoverRepository(_fetchFn: FetchLike, _baseUrl = ""): IHandoverRepository {
  return {
    async getNote(_fieldId: string): Promise<HandoverOutcome> {
      return { kind: "error" };
    },

    async createNote(_fieldId: string): Promise<CreateHandoverOutcome> {
      return { kind: "error" };
    },
  };
}
