/**
 * L0 の経路の表（docs/spec.md §6）。静的な経路を :id の経路より上に書く。
 * 各 API の中身は次のパケットで差し替える。
 */
import { patchAssignment } from "./assignment";
import type { Route } from "./deps";
import { errorResponse, json } from "./http";
import { postFieldStatus } from "./field-status";
import { getFieldsSummary } from "./fields";
import { getFieldHandover } from "./handover";
import { getJudgmentPage } from "./judgment-page";
import { postFieldHandover } from "./handover-post";
import { postLineWebhook } from "./line-webhook";
import { getPhotoFile } from "./photo-files";
import { getPhotosByField, getRecentPhotos } from "./photos";
import { deleteSession, getSession, postSession } from "./session";
import { getShareFile, getSharePage } from "./share-page";
import { postShares } from "./shares";
import { deleteStatusEvent } from "./status-events";
import { getFieldStatusEvents } from "./status-history";
import { postUploads } from "./uploads";

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
  { method: "POST", pattern: "/api/session", auth: "none", handler: postSession },
  { method: "POST", pattern: "/api/uploads", auth: "member", handler: postUploads },
  { method: "GET", pattern: "/api/photos", auth: "none", handler: getPhotosByField },
  { method: "GET", pattern: "/api/photos/recent", auth: "none", handler: getRecentPhotos },
  { method: "GET", pattern: "/api/photo-files/:id", auth: "none", handler: getPhotoFile },
  { method: "PATCH", pattern: "/api/photos/:id/assignment", auth: "admin", handler: patchAssignment },
  // 画面が役割を知る（11-03 本人決定）。表の添字を変えないよう末尾に足す。Allow は "POST, GET, DELETE"（DELETE は表の末尾）
  { method: "GET", pattern: "/api/session", auth: "member", handler: getSession },
  // L1 の判断の取り消し（T23）
  { method: "DELETE", pattern: "/api/status-events/:id", auth: "member", handler: deleteStatusEvent },
  // L1 の地図（T24）
  { method: "GET", pattern: "/api/fields/summary", auth: "none", handler: getFieldsSummary },
  // L1 の判断を残す（T25）
  { method: "POST", pattern: "/api/fields/:id/status", auth: "member", handler: postFieldStatus },
  // L1 の判断の履歴（T26）
  { method: "GET", pattern: "/api/fields/:id/status-events", auth: "none", handler: getFieldStatusEvents },
  // L6 の引き継ぎメモを読む（T29）
  { method: "GET", pattern: "/api/fields/:id/handover", auth: "none", handler: getFieldHandover },
  // L6 の引き継ぎメモを作り直す（T31）。Claude を呼ぶので admin だけ
  { method: "POST", pattern: "/api/fields/:id/handover", auth: "admin", handler: postFieldHandover },
  // L8 の webhook（#140）。Cookie ではなく LINE の署名で守る
  { method: "POST", pattern: "/api/line/webhook", auth: "none", handler: postLineWebhook },
  // LINE に 1 枚の共有（#159）。委員も作れる（11-06 先輩決定）
  { method: "POST", pattern: "/api/shares", auth: "member", handler: postShares },
  // LINE のサーバーが Cookie 無しで読む（#160）
  { method: "GET", pattern: "/api/shares/:id", auth: "none", handler: getSharePage },
  { method: "GET", pattern: "/api/share-files/:id", auth: "none", handler: getShareFile },
  // 判断ごとの OGP ページ。LINE の判断の通知のサムネイル（#220）
  { method: "GET", pattern: "/api/judgments/:id", auth: "none", handler: getJudgmentPage },
  // 出る（11-08）。Cookie を消すだけなので、入っていない端末でも 204。表の添字を変えないよう末尾に足す
  { method: "DELETE", pattern: "/api/session", auth: "none", handler: deleteSession },
];
