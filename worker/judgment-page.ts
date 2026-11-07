/**
 * GET /api/judgments/:id（判断ごとの OGP 付きの HTML、みっきぃ 7、#220）。
 * 認証なし（LINE のサーバーは Cookie 無しで取りに来る）。取り消し済みでも 200 で取り消しとして出す（?revoked の有無に関わらず D1 が正）。
 * 新しく保存するものは無い（根拠の写真は /api/photo-files で既に配っている）ので期限は無い。例外は握らない
 */
import fields from "@/data/fields.json";
import { judgmentPageHtml } from "@/services/judgment-page";
import { SHARE_PAGE_CACHE_CONTROL } from "./share-page";
import {
  parseStatusEventId,
  STATUS_EVENT_COLUMNS,
  statusEventFromRow,
  type StatusEventRow,
} from "@/services/status-events";
import type { Field } from "@/types";
import type { Handler } from "./deps";
import { errorResponse } from "./http";

const SELECT_EVENT = `SELECT ${STATUS_EVENT_COLUMNS.join(", ")} FROM field_status_events WHERE id = ?`;
/** 根拠の写真は、その畑に確定済みのものだけ（後で番号が変わった写真は出さない） */
const SELECT_PHOTO = "SELECT id, width, height FROM uploaded_photos WHERE id = ? AND state = 'confirmed' AND field_id = ?";

const namesById: Record<string, string> = Object.fromEntries((fields as Field[]).map((f) => [f.id, f.name]));

export const getJudgmentPage: Handler = async (_request, ctx) => {
  const id = parseStatusEventId(ctx.params.id);
  if (id === null) return errorResponse(404, "not_found");
  const row = await ctx.deps.db.prepare(SELECT_EVENT).bind(id).first<StatusEventRow>();
  if (row === null) return errorResponse(404, "not_found");
  const event = statusEventFromRow(row);
  const firstRef = event.refPhotoIds[0];
  const photo =
    firstRef === undefined
      ? null
      : await ctx.deps.db.prepare(SELECT_PHOTO).bind(firstRef, event.fieldId).first<{ id: string; width: number; height: number }>();
  const html = judgmentPageHtml({
    origin: ctx.url.origin,
    event,
    fieldName: namesById[event.fieldId] ?? "",
    photo,
  });
  return new Response(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": SHARE_PAGE_CACHE_CONTROL,
      "x-robots-tag": "noindex, nofollow",
      "content-security-policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'",
      "referrer-policy": "no-referrer",
    },
  });
};
