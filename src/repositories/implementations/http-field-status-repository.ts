/**
 * fetch で L1 の判断と地図の API（docs/spec.md §6）を呼ぶ保存先。fetch は引数で受け取る（AGENTS.md §4）。
 * HTTP の状態を「結果の種類」に読み分けるだけで、画面の文言は持たない（言葉は services/status-view）。
 */
import type { FieldSummary, StatusEvent } from "@/types";
import type { StatusInput } from "@/services/status-reason";
import type {
  HistoryOutcome,
  IFieldStatusRepository,
  PostStatusOutcome,
  RevokeOutcome,
  SummaryOutcome,
} from "@/repositories/interfaces/i-field-status-repository";
import { readJson, send, type FetchLike } from "./http-common";

/** 判断の形か（id が数）。細かい項目はサーバーの型に頼る */
function asStatusEvent(body: unknown): StatusEvent | null {
  return typeof body === "object" && body !== null && typeof (body as { id?: unknown }).id === "number"
    ? (body as StatusEvent)
    : null;
}

export function createHttpFieldStatusRepository(fetchFn: FetchLike, baseUrl = ""): IFieldStatusRepository {
  const fieldUrl = (fieldId: string, rest: string) => `${baseUrl}/api/fields/${encodeURIComponent(fieldId)}/${rest}`;

  return {
    async listSummary(): Promise<SummaryOutcome> {
      const response = await send(fetchFn, `${baseUrl}/api/fields/summary`);
      if (response === null) return { kind: "network-error" };
      if (response.status !== 200) return { kind: "error" };
      const fields = ((await readJson(response)) as { fields?: unknown } | null | undefined)?.fields;
      return Array.isArray(fields) ? { kind: "ok", fields: fields as FieldSummary[] } : { kind: "error" };
    },

    async listHistory(fieldId: string): Promise<HistoryOutcome> {
      const response = await send(fetchFn, fieldUrl(fieldId, "status-events"));
      if (response === null) return { kind: "network-error" };
      if (response.status !== 200) return { kind: "error" };
      const body = await readJson(response);
      return Array.isArray(body) ? { kind: "ok", events: body as StatusEvent[] } : { kind: "error" };
    },

    async postStatus(fieldId: string, input: StatusInput): Promise<PostStatusOutcome> {
      const { status, reasons, note, refPhotoIds } = input;
      const response = await send(fetchFn, fieldUrl(fieldId, "status"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reasons, note, refPhotoIds }),
      });
      if (response === null) return { kind: "network-error" };
      switch (response.status) {
        case 201: {
          const event = asStatusEvent(await readJson(response));
          return event === null ? { kind: "error" } : { kind: "created", event };
        }
        case 401:
          return { kind: "unauthorized" };
        case 422: {
          const reason = ((await readJson(response)) as { reason?: unknown } | null | undefined)?.reason;
          return { kind: "rejected", reason: typeof reason === "string" ? reason : null };
        }
        case 400:
        case 413:
        case 415:
          return { kind: "rejected", reason: null };
        default:
          return { kind: "error" };
      }
    },

    async revoke(eventId: number): Promise<RevokeOutcome> {
      const response = await send(fetchFn, `${baseUrl}/api/status-events/${eventId}`, { method: "DELETE" });
      if (response === null) return { kind: "network-error" };
      switch (response.status) {
        case 200: {
          const event = asStatusEvent(await readJson(response));
          return event === null ? { kind: "error" } : { kind: "ok", event };
        }
        case 401:
          return { kind: "unauthorized" };
        case 404:
          return { kind: "not-found" };
        default:
          return { kind: "error" };
      }
    },
  };
}
