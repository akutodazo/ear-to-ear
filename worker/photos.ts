/**
 * GET /api/photos/recent（未確定を含む新着の一覧。認証なし）と GET /api/photos?fieldId=（圃場ごとの確定済み、T22）。
 * 判定は Service（photo-query）、外の世界は deps.db だけ。例外は握らない。
 */
import { parseRecentLimit, PHOTO_LIST_COLUMNS, photoFromRow, type PhotoListRow } from "@/services/photo-query";
import type { Handler } from "./deps";
import { json } from "./http";

/** 並べ替えと件数は SQL で決める。件数は bind で渡す */
const RECENT_SQL = `SELECT ${PHOTO_LIST_COLUMNS.join(", ")} FROM uploaded_photos ORDER BY uploaded_at DESC, id DESC LIMIT ?`;

export const getRecentPhotos: Handler = async (_request, ctx) => {
  const limit = parseRecentLimit(ctx.url.searchParams.get("limit"));
  const { results } = await ctx.deps.db.prepare(RECENT_SQL).bind(limit).all<PhotoListRow>();
  return json(200, results.map(photoFromRow));
};

/** GET /api/photos?fieldId=（T22）。確定済みでその番号の写真を撮影日の新しい順に。番号が無い・一覧に無いなら 400 */
export const getPhotosByField: Handler = async () => {
  throw new Error("not implemented");
};
