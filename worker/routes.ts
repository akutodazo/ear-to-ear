/**
 * L0 の経路の表（docs/spec.md §6）。静的な経路を :id の経路より上に書く。
 * 各 API の中身は次のパケットで差し替える。
 */
import type { Route } from "./deps";
import { errorResponse, json } from "./http";

/** 未実装の経路。501 */
export async function notImplemented(): Promise<Response> {
  return errorResponse(501, "not_implemented");
}

/** 動作の確認用。200 { ok: true } だけを返し、中身を漏らさない */
export async function health(): Promise<Response> {
  return json(200, { ok: true });
}

export const routes: readonly Route[] = [
  { method: "GET", pattern: "/api/health", auth: "none", handler: health },
  { method: "POST", pattern: "/api/session", auth: "none", handler: notImplemented },
  { method: "POST", pattern: "/api/uploads", auth: "member", handler: notImplemented },
  { method: "GET", pattern: "/api/photos", auth: "none", handler: notImplemented },
  { method: "GET", pattern: "/api/photos/recent", auth: "none", handler: notImplemented },
  { method: "GET", pattern: "/api/photo-files/:id", auth: "none", handler: notImplemented },
  { method: "PATCH", pattern: "/api/photos/:id/assignment", auth: "admin", handler: notImplemented },
];
