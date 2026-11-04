/**
 * POST /api/fields/:id/handover（引き継ぎメモを作り直して保存する、L6、docs/spec.md §6、T31 #111）。admin だけ。
 * 判定は Service（handover-document・handover-request・handover-note・usage-limit）、外の世界は deps の db・claude・nowMs だけ。
 * 順: 一覧に無い圃場 404 → Claude が止まっている 503 → 記録を読む → 0 件 422 → 回数 429 → Claude → 502 → 保存して 200
 */
import type { Handler } from "./deps";
import { errorResponse } from "./http";

export const postFieldHandover: Handler = async () => errorResponse(501, "not_implemented");
