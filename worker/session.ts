/**
 * POST /api/session（合言葉 → Cookie、失敗は 10 分に 5 回まで）と GET /api/session（役割）。
 * 判定は Service（usage-limit・session-request・session-token）、外の世界は deps。例外は握らない。
 */
import type { Handler } from "./deps";

export const postSession: Handler = async () => {
  throw new Error("not implemented");
};

export const getSession: Handler = async () => {
  throw new Error("not implemented");
};
