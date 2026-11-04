/**
 * GET /api/fields/summary（地図用の各圃場のまとめ、L1、docs/spec.md §6、Issue #90）。認証なし。
 * 判定は Service（field-summary・status-events）、外の世界は deps.db と deps.knownFieldIds だけ。例外は握らない。
 */
import { summarizeFields, type UnconfirmedPhotoRow } from "@/services/field-summary";
import { STATUS_EVENT_COLUMNS, statusEventFromRow, type StatusEventRow } from "@/services/status-events";
import type { Handler } from "./deps";
import { json } from "./http";

/** 取り消していない判断の全部（圃場で絞らない。壊れた行は statusEventFromRow で 500） */
const EVENTS_SQL = `SELECT ${STATUS_EVENT_COLUMNS.join(", ")} FROM field_status_events WHERE revoked_at IS NULL`;

/** 未確定の写真の候補と委員の番号だけ。確定済みの写真は読まない */
const UNCONFIRMED_SQL = `SELECT candidate_field_ids, chosen_field_id FROM uploaded_photos WHERE state = 'unconfirmed'`;

export const getFieldsSummary: Handler = async (_request, ctx) => {
  const db = ctx.deps.db;
  const events = await db.prepare(EVENTS_SQL).all<StatusEventRow>();
  const photos = await db.prepare(UNCONFIRMED_SQL).all<UnconfirmedPhotoRow>();
  const fields = summarizeFields([...ctx.deps.knownFieldIds], events.results.map(statusEventFromRow), photos.results);
  return json(200, { fields });
};
