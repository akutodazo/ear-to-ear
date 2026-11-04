/**
 * GET /api/fields/:id/handover（圃場ページの引き継ぎメモ、L6、docs/spec.md §6、T29 #106）。認証なし。
 * 今のシーズン（日本時間の年）のメモを返す。無ければ 404。行の写しは Service（handover-note）。
 */
import type { Handler } from "./deps";
import { errorResponse } from "./http";

export const getFieldHandover: Handler = async () => errorResponse(501, "not_implemented");
