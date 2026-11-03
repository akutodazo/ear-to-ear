/**
 * GET /api/photo-files/:id（R2 の縮小画像を配信する。認証なし）。
 * キーは upload-form の r2KeyFor。D1 は触らない。例外は握らない。
 */
import { r2KeyFor } from "@/services/upload-form";
import type { Handler } from "./deps";
import { errorResponse } from "./http";

/** 画像のキャッシュ。id は UUID で中身は変わらないので、ブラウザに 1 日持たせる（public は Cloudflare 側の扱いが未確認なので避ける） */
export const PHOTO_FILE_CACHE_CONTROL = "private, max-age=86400";

export const getPhotoFile: Handler = async (_request, ctx) => {
  const object = await ctx.deps.photos.get(r2KeyFor(ctx.params.id));
  if (object === null) return errorResponse(404, "not_found");
  return new Response(object.body, {
    status: 200,
    headers: {
      "content-type": "image/jpeg",
      "content-length": String(object.size),
      "cache-control": PHOTO_FILE_CACHE_CONTROL,
    },
  });
};
