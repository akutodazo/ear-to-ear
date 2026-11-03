/**
 * POST /api/uploads（縮小画像と meta を検査し、R2 と D1 に「未確定」で残す）。
 * 判定は Service（upload-form・jpeg-segments・upload-meta）、外の世界は deps。例外は握らない（R2 の片付けだけ）。
 */
import type { Handler } from "./deps";

export const postUploads: Handler = async () => {
  throw new Error("not implemented");
};
