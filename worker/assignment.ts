/**
 * PATCH /api/photos/:id/assignment（管理者の確定・変更、docs/spec.md §4・§6、Issue #78）。
 * 判定は Service（assignment-request・photo-query）、外の世界は deps.db だけ。例外は握らない。
 */
import type { Handler } from "./deps";

export const patchAssignment: Handler = async () => {
  throw new Error("not implemented");
};
