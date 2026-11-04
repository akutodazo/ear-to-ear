/**
 * GET /api/fields/summary（地図用の各圃場のまとめ、L1、docs/spec.md §6、Issue #90）。認証なし。
 * 判定は Service（field-summary・status-events）、外の世界は deps.db と deps.knownFieldIds だけ。例外は握らない。
 */
import type { Handler } from "./deps";

export const getFieldsSummary: Handler = async () => {
  throw new Error("not implemented");
};
