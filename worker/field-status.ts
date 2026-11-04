/**
 * POST /api/fields/:id/status（判断と理由・根拠を残す、L1、docs/spec.md §6、Issue #91）。委員以上。
 * 判定は Service（status-request・status-reason・status-events）、外の世界は deps.db だけ。例外は握らない。
 */
import type { Handler } from "./deps";

export const postFieldStatus: Handler = async () => {
  throw new Error("not implemented");
};
