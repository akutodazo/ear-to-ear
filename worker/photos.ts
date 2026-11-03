/**
 * GET /api/photos/recent（未確定を含む新着の一覧。認証なし）。
 * 判定は Service（photo-query）、外の世界は deps.db だけ。例外は握らない。
 */
import type { Handler } from "./deps";

export const getRecentPhotos: Handler = async () => {
  throw new Error("not implemented");
};
