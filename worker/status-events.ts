/**
 * DELETE /api/status-events/:id（判断の取り消し、L1、docs/spec.md §6、Issue #89）。
 * 行は消さずに revoked_at を入れる。判定は Service（status-events）、外の世界は deps.db と、取り消しの後の LINE（line-notify）。例外は握らない。
 */
import {
  parseStatusEventId,
  STATUS_EVENT_COLUMNS,
  statusEventFromRow,
  type StatusEventRow,
} from "@/services/status-events";
import type { Handler } from "./deps";
import { errorResponse, json } from "./http";
import { notifyLine } from "./line-notify";

/** 取り消していない行だけを 1 文で取り消す（読んでから書く 2 文にしない）。時刻と id は bind で渡す */
const REVOKE_SQL = `UPDATE field_status_events SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL RETURNING ${STATUS_EVENT_COLUMNS.join(", ")}`;

export const deleteStatusEvent: Handler = async (_request, ctx) => {
  const id = parseStatusEventId(ctx.params.id);
  if (id === null) return errorResponse(404, "not_found");
  const revokedAt = new Date(ctx.deps.nowMs()).toISOString();
  const row = await ctx.deps.db.prepare(REVOKE_SQL).bind(revokedAt, id).first<StatusEventRow>();
  if (row === null) return errorResponse(404, "not_found");
  const event = statusEventFromRow(row);
  // 取り消しの後に LINE に 1 通（失敗しても 200 は変わらない、#141）
  ctx.deps.waitUntil(notifyLine(ctx.deps, event, "revoked", ctx.url.origin));
  return json(200, event);
};
