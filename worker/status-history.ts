/**
 * GET /api/fields/:id/status-events（圃場ページの判断の履歴、L1、docs/spec.md §6、Issue #99）。認証なし。
 * 取り消したものも含めて全件を新しい順に返す。行の写しは Service（status-events）、外の世界は deps.db だけ。例外は握らない。
 */
import { STATUS_EVENT_COLUMNS, statusEventFromRow, type StatusEventRow } from "@/services/status-events";
import type { Handler } from "./deps";
import { errorResponse, json } from "./http";

/** その圃場の判断の全部（取り消したものも）。at の新しい順、同じなら id の降順。番号は bind、上限は付けない */
const HISTORY_SQL = `SELECT ${STATUS_EVENT_COLUMNS.join(", ")} FROM field_status_events WHERE field_id = ? ORDER BY at DESC, id DESC`;

export const getFieldStatusEvents: Handler = async (_request, ctx) => {
  const fieldId = ctx.params.id;
  if (!ctx.deps.knownFieldIds.has(fieldId)) return errorResponse(404, "not_found");
  const { results } = await ctx.deps.db.prepare(HISTORY_SQL).bind(fieldId).all<StatusEventRow>();
  return json(200, results.map(statusEventFromRow));
};
