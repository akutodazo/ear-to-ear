/**
 * DELETE /api/status-events/:id（判断の取り消し、L1、docs/spec.md §6、Issue #89）。
 * 行は消さずに revoked_at を入れる。判定は Service（status-events）、外の世界は deps.db だけ。例外は握らない。
 */
import type { Handler } from "./deps";

export const deleteStatusEvent: Handler = async () => {
  throw new Error("not implemented");
};
