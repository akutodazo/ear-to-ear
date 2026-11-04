/**
 * GET /api/fields/:id/status-events（圃場ページの判断の履歴、L1、docs/spec.md §6、Issue #99）。認証なし。
 * 取り消したものも含めて全件を新しい順に返す。行の写しは Service（status-events）、外の世界は deps.db だけ。例外は握らない。
 */
import type { Handler } from "./deps";

export const getFieldStatusEvents: Handler = async () => {
  throw new Error("not implemented");
};
