/**
 * GET /api/fields/:id/handover（圃場ページの引き継ぎメモ、L6、docs/spec.md §6、T29 #106）。認証なし。
 * 今のシーズン（日本時間の年）のメモを返す。無ければ 404。行の写しは Service（handover-note）。
 */
import { HANDOVER_NOTE_COLUMNS, handoverNoteFromRow, handoverSeason, type HandoverNoteRow } from "@/services/handover-note";
import type { Handler } from "./deps";
import { errorResponse, json } from "./http";

/** その圃場・シーズンのメモ（主キーなので 0 か 1 行）。番号とシーズンは bind */
const HANDOVER_SQL = `SELECT ${HANDOVER_NOTE_COLUMNS.join(", ")} FROM handover_notes WHERE field_id = ? AND season = ?`;

export const getFieldHandover: Handler = async (_request, ctx) => {
  const fieldId = ctx.params.id;
  if (!ctx.deps.knownFieldIds.has(fieldId)) return errorResponse(404, "not_found");
  const season = handoverSeason(ctx.deps.nowMs());
  const row = await ctx.deps.db.prepare(HANDOVER_SQL).bind(fieldId, season).first<HandoverNoteRow>();
  if (row === null) return errorResponse(404, "not_found");
  return json(200, handoverNoteFromRow(row));
};
