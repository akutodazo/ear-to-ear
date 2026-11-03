/**
 * POST /api/session（合言葉 → Cookie、失敗は 10 分に 5 回まで）と GET /api/session（役割）。
 * 判定は Service（usage-limit・session-request・session-token）、外の世界は deps。例外は握らない。
 */
import { SESSION_DAYS } from "@/config";
import { clientIp, isJsonContentType, parseSessionBody, SESSION_BODY_MAX_CHARS } from "@/services/session-request";
import { issueSessionToken } from "@/services/session-token";
import { isLoginLimited, loginCounterKey, loginWindow, retryAfterSec, utcDay } from "@/services/usage-limit";
import { nowSec, requireSession } from "./auth";
import { buildSessionCookie } from "./cookies";
import type { Handler } from "./deps";
import { errorResponse, json, noContent } from "./http";

/** content-length が数として読めて上限を超えるか。読めなければ本文で判定する */
function declaredTooLarge(header: string | null): boolean {
  if (header === null || !/^\d+$/.test(header)) return false;
  return Number(header) > SESSION_BODY_MAX_CHARS;
}

export const postSession: Handler = async (request, { deps }) => {
  if (!isJsonContentType(request.headers.get("content-type"))) return errorResponse(415, "unsupported_media_type");
  if (declaredTooLarge(request.headers.get("content-length"))) return errorResponse(413, "payload_too_large");

  const body = parseSessionBody(await request.text());
  if (!body.ok) {
    return body.reason === "too_long" ? errorResponse(413, "payload_too_large") : errorResponse(400, "bad_request");
  }

  const nowMs = deps.nowMs();
  const window = loginWindow(nowMs);
  const ipHash = await deps.hashIp(clientIp(request.headers.get("cf-connecting-ip")), utcDay(nowMs));
  const key = loginCounterKey(ipHash, window.slot);

  const row = await deps.db
    .prepare("SELECT count FROM usage_counters WHERE key = ?")
    .bind(key)
    .first<{ count: number }>();
  if (isLoginLimited(row?.count ?? 0)) {
    const response = errorResponse(429, "too_many_attempts");
    response.headers.set("retry-after", String(retryAfterSec(window, nowMs)));
    return response;
  }

  const role = await deps.matchPassphrase(body.passphrase);
  if (role === null) {
    // 同時の失敗も数え落とさないよう、1 文の UPSERT で数える
    await deps.db
      .prepare(
        "INSERT INTO usage_counters (key, count, expires_at) VALUES (?, 1, ?) " +
          "ON CONFLICT(key) DO UPDATE SET count = count + 1",
      )
      .bind(key, window.expiresAt)
      .run();
    return errorResponse(401, "unauthorized");
  }

  const token = await issueSessionToken(
    { device: deps.newId(), role, exp: nowSec(deps) + SESSION_DAYS * 24 * 60 * 60 },
    deps.hmac,
  );
  const response = noContent();
  response.headers.set("set-cookie", buildSessionCookie(token));
  return response;
};

export const getSession: Handler = async (_request, ctx) => {
  return json(200, { role: requireSession(ctx).role });
};
