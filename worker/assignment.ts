/**
 * PATCH /api/photos/:id/assignment（管理者の確定・変更、docs/spec.md §4・§6、Issue #78）。
 * 判定は Service（assignment-request・photo-query）、外の世界は deps.db だけ。例外は握らない。
 * 番号の更新と履歴の追加は D1 の batch で一度に行う（spec §4）。確定済みと同じ番号なら何も変えない。
 */
import { assignmentBodyStatus, ASSIGNMENT_BODY_MAX_BYTES, parseAssignmentBody } from "@/services/assignment-request";
import { PHOTO_LIST_COLUMNS, photoFromRow, type PhotoListRow } from "@/services/photo-query";
import { isJsonContentType } from "@/services/session-request";
import { requireSession } from "./auth";
import { declaredTooLarge, readBodyLimited } from "./body";
import type { Handler } from "./deps";
import { errorResponse, json } from "./http";

const SELECT_PHOTO_SQL = `SELECT ${PHOTO_LIST_COLUMNS.join(", ")} FROM uploaded_photos WHERE id = ?`;

/**
 * 「確定済みで、もうその番号」でない行だけを変える条件。同じ要求が同時に来ても、
 * batch は 1 つずつ動くので、2 本目はこの条件で何もしない（履歴は 1 行）
 */
const NEEDS_CHANGE = "id = ? AND NOT (state = 'confirmed' AND field_id IS ?)";

/** 履歴は更新の前に、今の番号（未確定なら null）を from として写す */
const INSERT_HISTORY_SQL =
  "INSERT INTO photo_assignments (photo_id, from_field_id, to_field_id, actor_device, at) " +
  `SELECT id, field_id, ?, ?, ? FROM uploaded_photos WHERE ${NEEDS_CHANGE}`;

const UPDATE_PHOTO_SQL =
  `UPDATE uploaded_photos SET field_id = ?, state = 'confirmed', updated_at = ? WHERE ${NEEDS_CHANGE}`;

export const patchAssignment: Handler = async (request, ctx) => {
  const { deps } = ctx;
  if (!isJsonContentType(request.headers.get("content-type"))) return errorResponse(415, "unsupported_media_type");
  if (declaredTooLarge(request.headers.get("content-length"), ASSIGNMENT_BODY_MAX_BYTES)) {
    return errorResponse(413, "payload_too_large");
  }
  const bytes = await readBodyLimited(request, ASSIGNMENT_BODY_MAX_BYTES);
  if (bytes === null) return errorResponse(413, "payload_too_large");
  const body = parseAssignmentBody(new TextDecoder().decode(bytes), deps.knownFieldIds);
  if (!body.ok) {
    const status = assignmentBodyStatus(body.reason);
    return errorResponse(status, status === 413 ? "payload_too_large" : status === 422 ? "unprocessable" : "bad_request");
  }

  // 無い写真なら、batch はどの行にも当たらず（履歴も書かない）、読み直しが空で 404。
  // 読み直しも同じ batch に入れる（外で読むと、同時に来た別の番号の結果を返してしまう。PR #79 のレビュー #1）
  const photoId = ctx.params.id;
  const actor = requireSession(ctx).device;
  const nowIso = new Date(deps.nowMs()).toISOString();
  const results = await deps.db.batch([
    deps.db.prepare(INSERT_HISTORY_SQL).bind(body.fieldId, actor, nowIso, photoId, body.fieldId),
    deps.db.prepare(UPDATE_PHOTO_SQL).bind(body.fieldId, nowIso, photoId, body.fieldId),
    deps.db.prepare(SELECT_PHOTO_SQL).bind(photoId),
  ]);

  const row = (results[2] as { results?: PhotoListRow[] } | undefined)?.results?.[0];
  if (row === undefined) return errorResponse(404, "not_found");
  return json(200, photoFromRow(row));
};
