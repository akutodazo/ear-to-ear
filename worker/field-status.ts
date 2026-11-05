/**
 * POST /api/fields/:id/status（判断と理由・根拠を残す、L1、docs/spec.md §6、Issue #91）。委員以上。
 * 判定は Service（status-request・status-reason・status-events）、外の世界は deps.db と、記録の後の LINE（line-notify）。例外は握らない。
 */
import { isJsonContentType } from "@/services/session-request";
import { STATUS_EVENT_COLUMNS, statusEventFromRow, type StatusEventRow } from "@/services/status-events";
import { parseStatusBody, STATUS_BODY_MAX_BYTES } from "@/services/status-request";
import { requireSession } from "./auth";
import { declaredTooLarge, readBodyLimited } from "./body";
import type { Handler } from "./deps";
import { errorResponse, json } from "./http";
import { notifyLine } from "./line-notify";

/** 根拠にできるのは、その圃場に確定済みの写真だけ。番号は bind で渡す */
const CONFIRMED_PHOTOS_SQL = "SELECT id FROM uploaded_photos WHERE state = 'confirmed' AND field_id = ?";

/** 1 行足して、その行を返す。値は bind で渡す */
const INSERT_SQL =
  "INSERT INTO field_status_events (field_id, status, reasons, note, ref_photo_ids, actor_device, at) " +
  `VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING ${STATUS_EVENT_COLUMNS.join(", ")}`;

export const postFieldStatus: Handler = async (request, ctx) => {
  const { deps } = ctx;
  const session = requireSession(ctx);
  if (!isJsonContentType(request.headers.get("content-type"))) return errorResponse(415, "unsupported_media_type");
  if (declaredTooLarge(request.headers.get("content-length"), STATUS_BODY_MAX_BYTES)) {
    return errorResponse(413, "payload_too_large");
  }

  const fieldId = ctx.params.id;
  if (!deps.knownFieldIds.has(fieldId)) return errorResponse(422, "unprocessable", { reason: "unknown_field" });

  const bytes = await readBodyLimited(request, STATUS_BODY_MAX_BYTES);
  if (bytes === null) return errorResponse(413, "payload_too_large");

  const { results } = await deps.db.prepare(CONFIRMED_PHOTOS_SQL).bind(fieldId).all<{ id: string }>();
  const confirmed = new Set(results.map((r) => r.id));

  // 区切りをまたぐ多バイト文字が壊れないよう、つないだ後で文字に直す
  const body = parseStatusBody(new TextDecoder().decode(bytes), confirmed);
  if (!body.ok) {
    return body.status === 400
      ? errorResponse(400, "bad_request")
      : errorResponse(422, "unprocessable", { reason: body.reason });
  }

  const { status, reasons, note, refPhotoIds } = body.value;
  const row = await deps.db
    .prepare(INSERT_SQL)
    .bind(
      fieldId,
      status,
      JSON.stringify(reasons),
      note,
      JSON.stringify(refPhotoIds),
      session.device,
      new Date(deps.nowMs()).toISOString(),
    )
    .first<StatusEventRow>();
  if (row === null) throw new Error("field_status_events の INSERT が行を返さなかった");
  const event = statusEventFromRow(row);
  // 記録の後に LINE に 1 通（失敗しても 201 は変わらない、#141）
  deps.waitUntil(notifyLine(deps, event, "recorded", ctx.url.origin));
  return json(201, event);
};
