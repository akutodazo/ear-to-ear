/**
 * fetch で L6 の引き継ぎメモの API（docs/spec.md §6）を呼ぶ保存先。fetch は引数で受け取る（AGENTS.md §4）。
 * HTTP の状態を「結果の種類」に読み分けるだけで、画面の文言は持たない。
 */
import type { HandoverNote } from "@/types";
import type {
  CreateHandoverOutcome,
  HandoverOutcome,
  IHandoverRepository,
} from "@/repositories/interfaces/i-handover-repository";
import { send, type FetchLike } from "./http-photo-repository";

/** 本文がメモの形か（圃場の番号が文字列、records と blocks が配列）。細かい項目はサーバーの型に頼る */
async function readNote(response: Response): Promise<HandoverNote | null> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return null;
  }
  if (typeof body !== "object" || body === null) return null;
  const { fieldId, records, blocks } = body as Partial<Record<keyof HandoverNote, unknown>>;
  return typeof fieldId === "string" && Array.isArray(records) && Array.isArray(blocks)
    ? (body as HandoverNote)
    : null;
}

export function createHttpHandoverRepository(fetchFn: FetchLike, baseUrl = ""): IHandoverRepository {
  const handoverUrl = (fieldId: string) => `${baseUrl}/api/fields/${encodeURIComponent(fieldId)}/handover`;

  return {
    async getNote(fieldId: string): Promise<HandoverOutcome> {
      const response = await send(fetchFn, handoverUrl(fieldId));
      if (response === null) return { kind: "network-error" };
      if (response.status === 404) return { kind: "none" };
      if (response.status !== 200) return { kind: "error" };
      const note = await readNote(response);
      return note === null ? { kind: "error" } : { kind: "ok", note };
    },

    async createNote(fieldId: string): Promise<CreateHandoverOutcome> {
      const response = await send(fetchFn, handoverUrl(fieldId), { method: "POST" });
      if (response === null) return { kind: "network-error" };
      switch (response.status) {
        case 200: {
          const note = await readNote(response);
          return note === null ? { kind: "error" } : { kind: "created", note };
        }
        case 401:
          return { kind: "unauthorized" };
        case 403:
          return { kind: "forbidden" };
        case 404:
          return { kind: "not-found" };
        case 422:
          return { kind: "no-records" };
        case 429:
          return { kind: "usage-limit" };
        case 502:
          return { kind: "upstream-error" };
        default:
          return { kind: "error" };
      }
    },
  };
}
