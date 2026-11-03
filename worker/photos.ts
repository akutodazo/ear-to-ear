/**
 * GET /api/photos/recent（未確定を含む新着の一覧。認証なし）と GET /api/photos?fieldId=（圃場ごとの確定済み、T22）。
 * 判定は Service（photo-query）、外の世界は deps.db だけ。例外は握らない。
 */
import {
  FIELD_PHOTOS_LIMIT,
  parseFieldIdQuery,
  parseRecentLimit,
  PHOTO_LIST_COLUMNS,
  photoFromRow,
  type PhotoListRow,
} from "@/services/photo-query";
import type { Handler } from "./deps";
import { errorResponse, json } from "./http";

/** 並べ替えと件数は SQL で決める。件数は bind で渡す */
const RECENT_SQL = `SELECT ${PHOTO_LIST_COLUMNS.join(", ")} FROM uploaded_photos ORDER BY uploaded_at DESC, id DESC LIMIT ?`;

/** 撮影日の新しい順（null は後ろ）→ 届いた順の新しい順 → id の降順。番号と件数は bind で渡す */
const BY_FIELD_SQL = `SELECT ${PHOTO_LIST_COLUMNS.join(", ")} FROM uploaded_photos WHERE state = 'confirmed' AND field_id = ? ORDER BY taken_at IS NULL, taken_at DESC, uploaded_at DESC, id DESC LIMIT ?`;

export const getRecentPhotos: Handler = async (_request, ctx) => {
  const limit = parseRecentLimit(ctx.url.searchParams.get("limit"));
  const { results } = await ctx.deps.db.prepare(RECENT_SQL).bind(limit).all<PhotoListRow>();
  return json(200, results.map(photoFromRow));
};

/** GET /api/photos?fieldId=（T22）。確定済みでその番号の写真を撮影日の新しい順に。番号が無い・一覧に無いなら 400 */
export const getPhotosByField: Handler = async (_request, ctx) => {
  const fieldId = parseFieldIdQuery(ctx.url.searchParams.get("fieldId"), ctx.deps.knownFieldIds);
  if (fieldId === null) return errorResponse(400, "bad_request");
  const { results } = await ctx.deps.db.prepare(BY_FIELD_SQL).bind(fieldId, FIELD_PHOTOS_LIMIT).all<PhotoListRow>();
  return json(200, results.map(photoFromRow));
};
