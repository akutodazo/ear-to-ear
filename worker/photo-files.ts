/**
 * GET /api/photo-files/:id（R2 の縮小画像を配信する。認証なし）。
 * キーは upload-form の r2KeyFor。D1 は触らない。例外は握らない。
 */
import type { Handler } from "./deps";

/** 画像のキャッシュ。id は UUID で中身は変わらないので、ブラウザに 1 日持たせる（public は Cloudflare 側の扱いが未確認なので避ける） */
export const PHOTO_FILE_CACHE_CONTROL = "private, max-age=86400";

export const getPhotoFile: Handler = async () => {
  throw new Error("not implemented");
};
